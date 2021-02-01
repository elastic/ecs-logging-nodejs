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
const semver = require('semver')
const test = require('tap').test

const { ecsLoggingValidate } = require('../utils/lib/ecs-logging-validate')

const {
  version,
  stringify,
  formatError,
  formatHttpRequest,
  formatHttpResponse
} = require('./')

const ajv = new Ajv({
  allErrors: true,
  verbose: true
})
addFormats(ajv)
const validate = ajv.compile(require('../utils/schema.json'))

test('stringify should return a valid ecs json', t => {
  const ecsFields = {
    '@timestamp': new Date().toISOString(),
    'log.level': 'info',
    message: 'hello world',
    ecs: {
      version: '1.4.0'
    }
  }

  const line = stringify(ecsFields)
  const rec = JSON.parse(line)
  t.equal(validate(rec), true)
  t.equal(ecsLoggingValidate(line), null)
  t.end()
})

test('bad ECS json on purpose: @timestamp', t => {
  const ecsFields = {
    '@timestamp': 'not a date',
    'log.level': 'info',
    message: 'foo',
    ecs: {
      version: '1.4.0'
    }
  }

  const line = stringify(ecsFields)
  const rec = JSON.parse(line)

  t.equal(validate(rec), false)

  const err = ecsLoggingValidate(line)
  t.ok(err, 'got an ecsLoggingValidate error')
  t.equal(err.details.length, 1)
  t.ok(err.details[0].message)
  t.equal(err.details[0].specKey, 'type')
  t.equal(err.details[0].name, '@timestamp')

  t.end()
})

test('bad ECS json on purpose: message type, ecs.version missing', t => {
  const line = '{"@timestamp":"2021-02-01T21:21:06.281Z","log.level":"info","message":true,"foo":"bar"}'

  const err = ecsLoggingValidate(line)
  t.ok(err, 'got an ecsLoggingValidate error')
  t.equal(err.details.length, 2)
  t.equal(err.details[0].specKey, 'type')
  t.equal(err.details[0].name, 'message')
  t.equal(err.details[1].specKey, 'required')
  t.equal(err.details[1].name, 'ecs.version')

  t.end()
})

test('formatHttpRequest and formatHttpResponse should return a valid ecs object', t => {
  const server = http.createServer(handler)
  server.listen(0, () => {
    const body = JSON.stringify({ hello: 'world' })
    const req = http.request(
      `http://localhost:${server.address().port}/hello/world?foo=bar`,
      {
        method: 'POST',
        body,
        headers: {
          'user-agent': 'cool-agent',
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body)
        }
      },
      function (res) {
        res.on('data', function () {})
        res.on('end', function () {
          server.close(function () {
            t.end()
          })
        })
      }
    )
    req.on('error', t.ifErr)
    req.write(body)
    req.end()
  })

  function handler (req, res) {
    const ecs = {
      '@timestamp': new Date().toISOString(),
      'log.level': 'info',
      message: 'hello world',
      ecs: {
        version: '1.4.0'
      }
    }

    const resBody = 'ok'
    res.setHeader('content-type', 'text/plain')
    const contentLen = Buffer.byteLength(resBody)
    res.setHeader('content-length', String(contentLen))

    // add anchor
    req.url += '#anchor'

    formatHttpRequest(ecs, req)
    formatHttpResponse(ecs, res)

    const line = JSON.parse(stringify(ecs))
    t.ok(validate(line))
    t.equal(ecsLoggingValidate(line), null)

    t.deepEqual(line.user_agent, { original: 'cool-agent' })
    t.deepEqual(line.url, {
      path: '/hello/world',
      query: 'foo=bar',
      full: `http://localhost:${server.address().port}/hello/world?foo=bar#anchor`,
      fragment: 'anchor'
    })
    t.deepEqual(line.http, {
      version: '1.1',
      request: {
        method: 'post',
        headers: {
          'content-type': 'application/json',
          host: `localhost:${server.address().port}`,
          connection: 'close'
        },
        body: { bytes: 17 }
      },
      response: {
        status_code: 200,
        headers: { 'content-type': 'text/plain' },
        body: { bytes: contentLen }
      }
    })

    res.end(resBody)
  }
})

test('Should export a valid version', t => {
  t.ok(semver.valid(version))
  t.end()
})

test('stringify should emit valid tracing fields', t => {
  const before = {
    '@timestamp': new Date().toISOString(),
    'log.level': 'info',
    message: 'hello world',
    ecs: {
      version: '1.4.0'
    },
    trace: { id: 1 },
    transaction: { id: 2 },
    span: { id: 3, extra_fields: 'are dropped' }
  }

  const after = JSON.parse(stringify(before))
  t.ok(validate(after))
  t.equal(ecsLoggingValidate(after), null)
  t.deepEqual(after.trace, { id: '1' }, 'trace.id is stringified')
  t.deepEqual(after.transaction, { id: '2' }, 'transaction.id is stringified')
  t.deepEqual(after.span, { id: '3' },
    'span.id is stringified, extra fields are excluded')
  t.end()
})

test('formatError: Error', t => {
  const rec = {}
  formatError(rec, new Error('boom'))
  t.equal(rec.error.type, 'Error')
  t.equal(rec.error.message, 'boom')
  t.match(rec.error.stack_trace, /^Error: boom\n {4}at/)
  t.end()
})

test('formatError: TypeError', t => {
  const rec = {}
  formatError(rec, new TypeError('boom'))
  t.equal(rec.error.type, 'TypeError')
  t.equal(rec.error.message, 'boom')
  t.match(rec.error.stack_trace, /^TypeError: boom\n {4}at/)
  t.end()
})

test('formatError: MyError', t => {
  const rec = {}
  class MyError extends Error {}
  formatError(rec, new MyError('boom'))
  t.equal(rec.error.type, 'MyError')
  t.equal(rec.error.message, 'boom')
  t.match(rec.error.stack_trace, /^Error: boom\n {4}at/)
  t.end()
})

test('formatError: non-Error', t => {
  const rec = {}
  const nonError = { foo: 'bar' }
  formatError(rec, nonError)
  t.notOk(rec.error, 'should not be an "error" field')
  t.equal(rec.err, nonError, 'the "err" field should pass through unchanged')
  t.end()
})

test('formatError: MyError with removed constructor', t => {
  const rec = {}
  class MyError extends Error {}
  const err = new MyError('boom')
  err.constructor = { mwuhaha: true }
  formatError(rec, err)
  t.equal(rec.error.type, 'Error')
  t.equal(rec.error.message, 'boom')
  t.match(rec.error.stack_trace, /^Error: boom\n {4}at/)
  t.end()
})

test('formatError: non-Error', t => {
  const rec = {}
  const nonError = { foo: 'bar' }
  formatError(rec, nonError)
  t.notOk(rec.error, 'should not be an "error" field')
  t.equal(rec.err, nonError, 'the "err" field should pass through unchanged')
  t.end()
})
