// Licensed to Elasticsearch B.V. under one or more contributor
// license agreements. See the NOTICE file distributed with
// this work for additional information regarding copyright
// ownership. Elasticsearch B.V. licenses this file to you under
// the Apache License, Version 2.0 (the "License"); you may
// not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

'use strict'

const http = require('http')
const test = require('tap').test
const winston = require('winston')
const Transport = require('winston-transport')
const { MESSAGE } = require('triple-beam')
const addFormats = require('ajv-formats').default
const Ajv = require('ajv').default
const { version } = require('@elastic/ecs-helpers')

const ecsFormat = require('../')
const { ecsLoggingValidate } = require('../../../utils/lib/ecs-logging-validate')

const ajv = new Ajv({
  allErrors: true,
  verbose: true
})
addFormats(ajv)
const validate = ajv.compile(require('../../../utils/schema.json'))

// Winston transport to capture logged records. Parsed JSON records are on
// `.records`. Raw records (what Winston calls `info` objects) are on `.infos`.
class CaptureTransport extends Transport {
  constructor () {
    super()
    this.records = []
    this.infos = []
  }

  log (info, callback) {
    this.infos.push(info)
    const record = JSON.parse(info[MESSAGE])
    this.records.push(record)
    callback()
  }
}

test('Should produce valid ecs logs', t => {
  t.plan(4)

  const cap = new CaptureTransport()
  const logger = winston.createLogger({
    format: ecsFormat(),
    transports: [cap]
  })
  logger.info('ecs is cool!')
  logger.error('ecs is cool!', { hello: 'world' })

  cap.records.forEach((rec) => {
    t.ok(validate(rec))
  })
  cap.infos.forEach((info) => {
    t.equal(ecsLoggingValidate(info[MESSAGE]), null)
  })
  t.end()
})

test('Bad ecs log (on purpose)', t => {
  t.plan(2)

  const cap = new CaptureTransport()
  const logger = winston.createLogger({
    format: ecsFormat(),
    transports: [cap]
  })
  logger.info('hi', { hello: 'world' })

  cap.records.forEach((rec) => {
    rec['@timestamp'] = true // Intentionally break it
    t.notOk(validate(rec))
    t.notOk(ecsLoggingValidate(rec))
  })
  t.end()
})

test('Should set expected @timestamp, "log.level", message', t => {
  const cap = new CaptureTransport()
  const logger = winston.createLogger({
    format: ecsFormat(),
    transports: [cap]
  })
  logger.info('hi')

  t.equal(cap.records.length, 1)
  const rec = cap.records[0]
  t.equal(typeof (rec['@timestamp']), 'string', '@timestamp')
  t.equal(rec['log.level'], 'info', 'log.level')
  t.equal(rec.message, 'hi', 'message')

  // Should *not* have a 'level' field.
  t.notOk(rec.level, 'should not have a "level" field')

  t.end()
})

test('Should append additional fields to the log record', t => {
  const cap = new CaptureTransport()
  const logger = winston.createLogger({
    format: ecsFormat(),
    transports: [cap]
  })
  logger.info('hi', { foo: 'bar', faz: 'baz' })

  cap.records.forEach((rec) => {
    t.equal(rec.foo, 'bar')
    t.equal(rec.faz, 'baz')
  })
  t.end()
})

test('Should not be able to override ECS fields with additional fields', t => {
  const cap = new CaptureTransport()
  const logger = winston.createLogger({
    format: ecsFormat(),
    transports: [cap]
  })
  // Even if specified in the additional fields (what Winston calls "meta"),
  // the core ECS fields should not be overriden.
  logger.info('hi', {
    'log.level': 'boom',
    log: 'boom',
    ecs: 'boom',
    '@timestamp': 'boom'
  })

  const rec = cap.records[0]
  t.equal(rec['log.level'], 'info', 'log.level')
  t.equal(rec['ecs.version'], version, 'ecs.version')
  t.not(rec['@timestamp'], 'boom', '@timestamp')
  t.end()
})

test('Should be able to set log.logger', t => {
  const cap = new CaptureTransport()
  const logger = winston.createLogger({
    format: ecsFormat(),
    transports: [cap]
  })
  logger.info('hi', { log: { logger: 'myService' } })

  t.equal(cap.records[0].log.logger, 'myService')
  t.end()
})

test('can log non-HTTP res & req fields', t => {
  const cap = new CaptureTransport()
  const logger = winston.createLogger({
    format: ecsFormat(),
    transports: [cap]
  })
  logger.info('hi', { req: { id: 42 }, res: { status: 'OK' } })

  cap.records.forEach((rec) => {
    t.equal(rec.req.id, 42)
    t.equal(rec.res.status, 'OK')
  })
  t.end()
})

test('http request and response (req, res keys)', t => {
  const cap = new CaptureTransport()
  const logger = winston.createLogger({
    format: ecsFormat({ convertReqRes: true }),
    transports: [cap]
  })

  const server = http.createServer(function handler (req, res) {
    logger.info('incoming request', { req }) // record 0
    req.url += '#anchor'
    res.end('ok')
    logger.info('sent response', { res }) // record 1
  })

  server.listen(0, () => {
    const body = JSON.stringify({ hello: 'world' })
    const req = http.request(
      `http://localhost:${server.address().port}?foo=bar`,
      {
        method: 'POST',
        headers: {
          'user-agent': 'cool-agent',
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body)
        }
      },
      function (res) {
        res.on('data', function () {})
        res.on('close', function () {
          t.equal(cap.records.length, 2)
          t.ok(validate(cap.records[0]), 'record 0 is ECS valid')
          t.equal(ecsLoggingValidate(cap.infos[0][MESSAGE]), null)
          t.ok(validate(cap.records[1]), 'record 1 is ECS valid')
          t.equal(ecsLoggingValidate(cap.infos[1][MESSAGE]), null)
          // Spot check that some of the ECS HTTP fields are there.
          t.equal(cap.records[0].http.request.method, 'POST',
            'http.request.method')
          t.equal(cap.records[1].http.response.status_code, 200,
            'http.response.status_code')
          server.close(function () {
            t.end()
          })
        })
      }
    )

    req.write(body)
    req.end()
  })
})

test('convertErr is true by default', t => {
  const cap = new CaptureTransport()
  const log = winston.createLogger({
    format: ecsFormat(),
    transports: [cap]
  })

  log.info('hi', { err: new Error('boom') })
  const rec = cap.records[0]
  t.ok(validate(rec))
  t.equal(ecsLoggingValidate(cap.infos[0][MESSAGE]), null)
  t.equal(rec.error.type, 'Error')
  t.equal(rec.error.message, 'boom')
  t.match(rec.error.stack_trace, /^Error: boom\n {4}at/)
  t.equal(rec.err, undefined)
  t.end()
})

test('convertErr does not blow up on non-Errors', t => {
  const cap = new CaptureTransport()
  const log = winston.createLogger({
    format: ecsFormat(),
    transports: [cap]
  })

  log.info('one', { err: 42 })
  log.info('two', { err: false })
  log.info('three', { err: null })
  log.info('four', { err: { foo: 'bar' } })
  t.equal(cap.records[0].err, 42)
  t.equal(cap.records[1].err, false)
  t.equal(cap.records[2].err, null)
  t.same(cap.records[3].err, { foo: 'bar' })
  t.end()
})

test('convertErr=false allows passing through err=<non-Error>', t => {
  const cap = new CaptureTransport()
  const log = winston.createLogger({
    format: ecsFormat({ convertErr: false }),
    transports: [cap]
  })

  log.info('hi', { err: 42 })
  const rec = cap.records[0]
  t.ok(validate(rec))
  t.equal(ecsLoggingValidate(cap.infos[0][MESSAGE]), null)
  t.equal(rec.err, 42, 'rec.err is unchanged')
  t.equal(rec.error, undefined, 'no rec.error is set')
  t.end()
})

test('can configure correlation fields', t => {
  const cap = new CaptureTransport()
  const logger = winston.createLogger({
    format: ecsFormat({
      serviceName: 'override-serviceName',
      serviceVersion: 'override-serviceVersion',
      serviceEnvironment: 'override-serviceEnvironment',
      serviceNodeName: 'override-serviceNodeName',
      eventDataset: 'override-eventDataset'
    }),
    transports: [cap]
  })
  logger.info('hi')

  const rec = cap.records[0]
  t.equal(rec['service.name'], 'override-serviceName')
  t.equal(rec['service.version'], 'override-serviceVersion')
  t.equal(rec['service.environment'], 'override-serviceEnvironment')
  t.equal(rec['service.node.name'], 'override-serviceNodeName')
  t.equal(rec['event.dataset'], 'override-eventDataset')
  t.end()
})

test('can handle circular refs', t => {
  const cap = new CaptureTransport()
  const logger = winston.createLogger({
    format: ecsFormat(),
    transports: [cap]
  })

  var obj = {foo: 'bar'}
  obj.self = obj
  logger.info('hi', { obj })

  const rec = cap.records[0]
  t.strictSame(rec.obj, { foo: 'bar', self: '[Circular]' })
  t.end()
})
