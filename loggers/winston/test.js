// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const http = require('http')
const test = require('tap').test
const sget = require('simple-get')
const stoppable = require('stoppable')
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
    rec['@timestamp'] = true
    t.false(validate(rec))
  })
  t.end()
})

test('Should not change the message', t => {
  t.plan(1)

  const cap = new CaptureTransport()
  const logger = winston.createLogger({
    format: ecsFormat(),
    transports: [cap]
  })
  logger.info('hi')

  cap.records.forEach((rec) => {
    t.equal(rec.message, 'hi')
  })
  t.end()
})

test('Should not change the log level', t => {
  t.plan(1)

  const cap = new CaptureTransport()
  const logger = winston.createLogger({
    format: ecsFormat(),
    transports: [cap]
  })
  logger.error('oh noes')

  cap.records.forEach((rec) => {
    // XXX t.equal
    t.equal(rec['log.level'], 'error')
  })
  t.end()
})

test('Should append any additional property to the log message', t => {
  t.plan(2)

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

test('can log non-HTTP res & req fields', t => {
  t.plan(2)

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

  const server = stoppable(http.createServer(function handler (req, res) {
    logger.info('incoming request', { req })
    req.url += '#anchor'
    res.end('ok')
    logger.info('sent response', { res })
  }))

  server.listen(0, () => {
    const body = JSON.stringify({ hello: 'world' })
    sget({
      method: 'POST',
      url: `http://localhost:${server.address().port}?foo=bar`,
      body,
      headers: {
        'user-agent': 'cool-agent',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body)
      }
    }, (err, _res) => {
      t.error(err)
      cap.records.forEach((rec) => {
        t.ok(validate(rec), 'record is ECS valid')
      })
      server.stop()
      t.end()
    })
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
