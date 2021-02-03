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

const addFormats = require('ajv-formats').default
const Ajv = require('ajv').default
const express = require('express')
const morgan = require('morgan')
const split = require('split2')
const test = require('tap').test

const ecsFormat = require('../')
const { ecsLoggingValidate } = require('../../../utils/lib/ecs-logging-validate')

const ajv = new Ajv({
  allErrors: true,
  verbose: true
})
addFormats(ajv)
const validate = ajv.compile(require('../../../utils/schema.json'))

// 1. Make an Express server using a given morgan ECS format `logger`.
// 2. Make a request against it.
// 3. Shutdown the server and callback `cb(err)`.
function makeExpressServerAndRequest (logger, path, reqOpts, body, cb) {
  const app = express()
  app.set('env', 'test') // silences Express default `logerror`
  app.use(logger)
  app.post('/', (req, res) => {
    res.end('ok')
  })
  app.get('/error', (req, res, next) => {
    next(new Error('boom'))
  })

  const server = app.listen(0, () => {
    // const body = JSON.stringify({ hello: 'world' })
    const req = http.request(
      `http://localhost:${server.address().port}${path}`,
      reqOpts,
      function (res) {
        res.on('data', function () {})
        res.on('close', function () {
          server.close(cb)
        })
      }
    )
    if (body) {
      req.write(body)
    }
    req.end()
  })
}

test('Should produce valid ecs logs', t => {
  t.plan(3)

  const stream = split().on('data', line => {
    const rec = JSON.parse(line)
    t.true(validate(rec))
    t.equal(ecsLoggingValidate(line), null)
  })
  const logger = morgan(ecsFormat(), { stream })

  makeExpressServerAndRequest(logger, '/?foo=bar', { method: 'POST' }, 'hi', function (err) {
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

  makeExpressServerAndRequest(logger, '/?foo=bar', { method: 'POST' }, 'hi', function (err) {
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

  makeExpressServerAndRequest(logger, '/?foo=bar', { method: 'POST' }, 'hi', function (err) {
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

  makeExpressServerAndRequest(logger, '/?foo=bar', { method: 'POST' }, 'hi', function (err) {
    t.ifErr(err)
    t.end()
  })
})

test('"format" argument - format function', t => {
  t.plan(2)

  // Example:
  //  POST /?foo=bar 200 - - 0.073 ms
  const format = morgan.compile(morgan.tiny)
  const msgRe = /^POST \/\?foo=bar 200 - - \d+\.\d+ ms$/
  const stream = split().on('data', line => {
    const rec = JSON.parse(line)
    t.match(rec.message, msgRe, 'rec.message')
  })
  const logger = morgan(ecsFormat(format), { stream })

  makeExpressServerAndRequest(logger, '/?foo=bar', { method: 'POST' }, 'hi', function (err) {
    t.ifErr(err)
    t.end()
  })
})

test('"log.level" for successful response is "info"', t => {
  t.plan(2)

  const stream = split().on('data', line => {
    const rec = JSON.parse(line)
    t.equal(rec['log.level'], 'info')
  })
  const logger = morgan(ecsFormat(), { stream })

  makeExpressServerAndRequest(logger, '/', {}, null, function (err) {
    t.ifErr(err)
    t.end()
  })
})

test('"log.level" for failing response is "error"', t => {
  t.plan(2)

  const stream = split().on('data', line => {
    const rec = JSON.parse(line)
    t.equal(rec['log.level'], 'error')
  })
  const logger = morgan(ecsFormat(), { stream })

  makeExpressServerAndRequest(logger, '/error', {}, null, function (err) {
    t.ifErr(err)
    t.end()
  })
})
