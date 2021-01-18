// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const http = require('http')
const test = require('ava')
const sget = require('simple-get')
const stoppable = require('stoppable')
const Ajv = require('ajv')
const Pino = require('pino')
const split = require('split2')
const ecsFormat = require('./')

const ajv = Ajv({
  allErrors: true,
  verbose: true,
  format: 'full'
})
const validate = ajv.compile(require('../../utils/schema.json'))

test('Should produce valid ecs logs', t => {
  t.plan(2)

  const stream = split(JSON.parse).on('data', line => {
    t.deepEqual(line['log.level'], 'info')
    t.true(validate(line))
  })

  const pino = Pino({ ...ecsFormat() }, stream)
  pino.info('Hello world')
})

test('Should map "name" to "log.logger"', t => {
  t.plan(2)

  const stream = split(JSON.parse).on('data', line => {
    t.deepEqual(line.log, { logger: 'myName' })
    t.true(validate(line))
  })

  const pino = Pino({ name: 'myName', ...ecsFormat() }, stream)
  pino.info('Hello world')
})

test('Should append any additional property to the log message', t => {
  t.plan(2)

  const stream = split(JSON.parse).on('data', line => {
    t.is(line.foo, 'bar')
    t.true(validate(line))
  })

  const pino = Pino({ ...ecsFormat() }, stream)
  pino.info({ foo: 'bar' }, 'Hello world')
})

test.cb('can log non-HTTP res & req fields', t => {
  const recs = []
  const stream = split(JSON.parse).on('data', rec => { recs.push(rec) })
  const log = Pino({ ...ecsFormat() }, stream)
  log.info({ req: { id: 42 }, res: { status: 'OK' } }, 'hi')
  t.is(recs[0].req.id, 42)
  t.is(recs[0].res.status, 'OK')
  t.end()
})

test.cb('convertReqRes:true and HTTP req, res', t => {
  t.plan(4)

  const stream = split(JSON.parse).on('data', rec => {
    t.true(validate(rec))
    // Spot check that some of the ECS HTTP fields are there.
    t.is(rec.http.request.method, 'post', 'http.request.method')
    t.is(rec.http.response.status_code, 200, 'http.response.status_code')
  })

  const log = Pino({ ...ecsFormat({ convertReqRes: true }) }, stream)

  const server = stoppable(http.createServer(handler))
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
    }, (err, res) => {
      t.falsy(err)
      server.stop()
      t.end()
    })
  })

  function handler (req, res) {
    // test also the anchor
    req.url += '#anchor'
    res.end('ok')
    log.info({ req, res }, 'handled request')
  }
})
