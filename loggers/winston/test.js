// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const http = require('http')
const test = require('tap').test
const winston = require('winston')
const Transport = require('winston-transport')
const { MESSAGE } = require('triple-beam')
const Ajv = require('ajv')
const { version } = require('@elastic/ecs-helpers')

const ecsFormat = require('./')

const ajv = Ajv({
  allErrors: true,
  verbose: true,
  format: 'full'
})
const validate = ajv.compile(require('../../utils/schema.json'))

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
  t.plan(2)

  const cap = new CaptureTransport()
  const logger = winston.createLogger({
    format: ecsFormat(),
    transports: [cap]
  })
  logger.info('ecs is cool!')
  logger.error('ecs is cool!', { hello: 'world' })

  cap.records.forEach((rec) => {
    t.true(validate(rec))
  })
  t.end()
})

test('Bad ecs log (on purpose)', t => {
  t.plan(1)

  const cap = new CaptureTransport()
  const logger = winston.createLogger({
    format: ecsFormat(),
    transports: [cap]
  })
  logger.info('hi', { hello: 'world' })

  cap.records.forEach((rec) => {
    rec['@timestamp'] = true // Intentionally break it
    t.false(validate(rec))
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
  t.equal(rec['log.level'], 'info', '"log.level"')
  t.equal(rec.ecs.version, version, 'ecs.version')
  t.notEqual(rec['@timestamp'], 'boom', '@timestamp')
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
          t.ok(validate(cap.records[1]), 'record 1 is ECS valid')
          // Spot check that some of the ECS HTTP fields are there.
          t.equal(cap.records[0].http.request.method, 'post',
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

test('Keys order', t => {
  t.plan(2)

  const cap = new CaptureTransport()
  const logger = winston.createLogger({
    format: ecsFormat(),
    transports: [cap]
  })
  logger.info('hi') // index 0
  logger.error('oh noes', { hello: 'world' }) // index 1

  t.equal(cap.infos[0][MESSAGE],
    `{"@timestamp":"${cap.records[0]['@timestamp']}","log.level":"info","message":"hi","ecs":{"version":"${version}"}}`)
  t.equal(cap.infos[1][MESSAGE],
    `{"@timestamp":"${cap.records[1]['@timestamp']}","log.level":"error","message":"oh noes","ecs":{"version":"${version}"},"hello":"world"}`)
  t.end()
})
