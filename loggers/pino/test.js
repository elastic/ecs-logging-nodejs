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

test.cb('http request and response (req, res keys)', t => {
  t.plan(2)

  const stream = split(JSON.parse).on('data', line => {
    t.true(validate(line))
  })

  const pino = Pino({ ...ecsFormat() }, stream)

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
    pino.info({ req, res }, 'incoming request')
    res.end('ok')
  }
})

test.cb('http request and response (request, response keys)', t => {
  t.plan(2)

  const stream = split(JSON.parse).on('data', line => {
    t.true(validate(line))
  })

  const pino = Pino({ ...ecsFormat() }, stream)

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

  function handler (request, response) {
    // test also the anchor
    request.url += '#anchor'
    pino.info({ request, response }, 'incoming request')
    response.end('ok')
  }
})
