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

// Test everything that doesn't fit in a separate file.

const http = require('http')

const addFormats = require('ajv-formats').default
const Ajv = require('ajv').default
const pino = require('pino')
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

test('Should produce valid ecs logs', t => {
  const stream = split().once('data', line => {
    const rec = JSON.parse(line)
    t.deepEqual(rec['log.level'], 'info')
    t.ok(validate(rec))
    t.equal(ecsLoggingValidate(line, { ignoreIndex: true }), null)
    t.end()
  })

  const log = pino({ ...ecsFormat() }, stream)
  log.info('Hello world')
})

test('Should map "name" to "log.logger"', t => {
  const stream = split().once('data', line => {
    const rec = JSON.parse(line)
    t.deepEqual(rec.log, { logger: 'myName' })
    t.ok(validate(rec))
    t.equal(ecsLoggingValidate(line, { ignoreIndex: true }), null)
    t.end()
  })

  // Pass in empty opts object to ecsFormat() for coverage.
  const log = pino({ name: 'myName', ...ecsFormat({}) }, stream)
  log.info('Hello world')
})

test('Should append any additional property to the log message', t => {
  const stream = split().once('data', line => {
    const rec = JSON.parse(line)
    t.equal(rec.foo, 'bar')
    t.ok(validate(rec))
    t.equal(ecsLoggingValidate(line, { ignoreIndex: true }), null)
    t.end()
  })

  const log = pino({ ...ecsFormat() }, stream)
  log.info({ foo: 'bar' }, 'Hello world')
})

test('can log non-HTTP res & req fields', t => {
  const recs = []
  const stream = split(JSON.parse).on('data', rec => { recs.push(rec) })
  const log = pino({ ...ecsFormat() }, stream)
  log.info({ req: { id: 42 }, res: { status: 'OK' } }, 'hi')
  t.equal(recs[0].req.id, 42)
  t.equal(recs[0].res.status, 'OK')
  t.end()
})

test('convertReqRes:true and HTTP req, res', t => {
  t.plan(7)

  const stream = split().on('data', line => {
    const rec = JSON.parse(line)
    t.ok(validate(rec))
    t.equal(ecsLoggingValidate(line, { ignoreIndex: true }), null)
    if (rec.message === 'handled request') {
      // Spot check that some of the ECS HTTP and User agent fields are there.
      t.equal(rec.http.request.method, 'get', 'http.request.method')
      t.equal(rec.http.response.status_code, 200, 'http.response.status_code')
      t.equal(rec.user_agent.original, 'cool-agent', 'user_agent.original')
    }
  })

  const log = pino({ ...ecsFormat({ convertReqRes: true }) }, stream)

  const server = http.createServer(handler)
  server.listen(0, () => {
    // Log a record that doesn't pass req/res for coverage testing.
    log.info('listening')

    http.get(`http://localhost:${server.address().port}?foo=bar`, {
      headers: {
        'user-agent': 'cool-agent'
      }
    }, function (res) {
      res.on('data', function () {})
      res.on('close', function () {
        server.close(function () {
          t.end()
        })
      })
    })
  })

  function handler (req, res) {
    // test also the anchor
    req.url += '#anchor'
    res.end('ok')
    log.info({ req, res }, 'handled request')
  }
})

test('convertErr is true by default', t => {
  const lines = []
  const stream = split().on('data', line => { lines.push(line) })
  const log = pino({ ...ecsFormat() }, stream)

  log.info({ err: new Error('boom') }, 'hi')
  const rec = JSON.parse(lines[0])
  t.ok(validate(rec))
  t.equal(ecsLoggingValidate(lines[0], { ignoreIndex: true }), null)
  t.equal(rec.error.type, 'Error')
  t.equal(rec.error.message, 'boom')
  t.match(rec.error.stack_trace, /^Error: boom\n {4}at/)
  t.end()
})

test('convertErr does not blow up on non-Errors', t => {
  const recs = []
  const stream = split(JSON.parse).on('data', rec => { recs.push(rec) })
  const log = pino({ ...ecsFormat() }, stream)

  log.info({ err: 42 }, 'one')
  log.info({ err: false }, 'two')
  log.info({ err: null }, 'three')
  log.info({ err: { foo: 'bar' } }, 'four')
  t.equal(recs[0].err, 42)
  t.equal(recs[1].err, false)
  t.equal(recs[2].err, null)
  t.deepEqual(recs[3].err, { foo: 'bar' })
  t.end()
})

test('convertErr=false allows passing through err=<non-Error>', t => {
  const lines = []
  const stream = split().on('data', line => { lines.push(line) })
  // For *coverage* testing we also set `convertReqRes` to ensure
  // createEcsPinoOptions includes a `formatters.log` function.
  const log = pino(
    { ...ecsFormat({ convertErr: false, convertReqRes: true }) },
    stream)

  log.info({ err: 42 }, 'hi')
  const rec = JSON.parse(lines[0])
  t.ok(validate(rec))
  t.equal(ecsLoggingValidate(lines[0], { ignoreIndex: true }), null)
  t.equal(rec.err, 42, 'rec.err is unchanged')
  t.equal(rec.error, undefined, 'no rec.error is set')
  t.end()
})

test('createEcsPinoOptions with no formatters.log', t => {
  // There is a supposed fast path in createEcsPinoOptions where formatters.log
  // is excluded. Since convertErr is true by default, this case is rare.
  // For coverage testing, we concoct that case here.
  const lines = []
  const stream = split().on('data', line => { lines.push(line) })
  const log = pino({ ...ecsFormat({ convertErr: false }) }, stream)

  log.info({ err: 42, req: 'my req', res: null }, 'hi')
  const rec = JSON.parse(lines[0])
  t.ok(validate(rec))
  t.equal(ecsLoggingValidate(lines[0], { ignoreIndex: true }), null)
  t.equal(rec.err, 42)
  t.equal(rec.req, 'my req')
  t.equal(rec.res, null)
  t.end()
})
