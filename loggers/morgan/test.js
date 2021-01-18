// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const http = require('http')

const Ajv = require('ajv')
const express = require('express')
const morgan = require('morgan')
const split = require('split2')
const test = require('tap').test

const ecsFormat = require('./')

const ajv = Ajv({
  allErrors: true,
  verbose: true,
  format: 'full'
})
const validate = ajv.compile(require('../../utils/schema.json'))

// 1. Make an Express server using a given morgan ECS format `logger`.
// 2. Make a canned `POST /?foo=bar` request against.
// 3. Shutdown the server and callback `cb(err)`.
function makeExpressServerAndRequest (logger, cb) {
  const app = express()
  app.use(logger)
  app.use('/', (req, res) => {
    res.end('ok')
  })

  const server = app.listen(0, () => {
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
          server.close(cb)
        })
      }
    )
    req.write(body)
    req.end()
  })
}

test('Should produce valid ecs logs', t => {
  t.plan(2)

  const stream = split(JSON.parse).on('data', line => {
    t.true(validate(line))
  })
  const logger = morgan(ecsFormat(), { stream })

  makeExpressServerAndRequest(logger, function (err) {
    t.ifErr(err)
    t.end()
  })
})

test('Keys order', t => {
  t.plan(2)

  const stream = split().on('data', line => {
    const rec = JSON.parse(line)
    const expectedLineStart = `{"@timestamp":"${rec['@timestamp']}","log.level":"info","message":"${JSON.stringify(rec.message).slice(1, -1)}",`
    t.equal(line.slice(0, expectedLineStart.length), expectedLineStart,
      'log line starts with the expected @timestamp, log.level, and message fields')
  })
  const logger = morgan(ecsFormat(), { stream })

  makeExpressServerAndRequest(logger, function (err) {
    t.ifErr(err)
    t.end()
  })
})

test('"format" argument - format name', t => {
  t.plan(2)

  // Example:
  //  POST /?foo=bar 200 - - 0.073 ms
  const format = 'tiny' // https://github.com/expressjs/morgan#tiny
  const msgRe = /^POST \/\?foo=bar 200 - - \d+\.\d+ ms$/
  const stream = split().on('data', line => {
    const rec = JSON.parse(line)
    t.match(rec.message, msgRe, 'rec.message')
  })
  const logger = morgan(ecsFormat(format), { stream })

  makeExpressServerAndRequest(logger, function (err) {
    t.ifErr(err)
    t.end()
  })
})

test('"format" argument - format string', t => {
  t.plan(2)

  // Example:
  //  POST /?foo=bar 200
  const format = ':method :url :status'
  const msgRe = /^POST \/\?foo=bar 200$/
  const stream = split().on('data', line => {
    const rec = JSON.parse(line)
    t.match(rec.message, msgRe, 'rec.message')
  })
  const logger = morgan(ecsFormat(format), { stream })

  makeExpressServerAndRequest(logger, function (err) {
    t.ifErr(err)
    t.end()
  })
})

test('"format" argument - format function', t => {
  t.plan(2)

  // Example:
  //  POST /?foo=bar 200 - - 0.073 ms
  const format = morgan.tiny
  const msgRe = /^POST \/\?foo=bar 200 - - \d+\.\d+ ms$/
  const stream = split().on('data', line => {
    const rec = JSON.parse(line)
    t.match(rec.message, msgRe, 'rec.message')
  })
  const logger = morgan(ecsFormat(format), { stream })

  makeExpressServerAndRequest(logger, function (err) {
    t.ifErr(err)
    t.end()
  })
})
