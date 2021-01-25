// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const http = require('http')

const Ajv = require('ajv')
const semver = require('semver')
const test = require('tap').test

const {
  version,
  stringify,
  formatHttpRequest,
  formatHttpResponse
} = require('./')

const ajv = Ajv({
  allErrors: true,
  verbose: true,
  format: 'full'
})
const validate = ajv.compile(require('../utils/schema.json'))

test('stringify should return a valid ecs json', t => {
  const ecs = {
    '@timestamp': new Date().toISOString(),
    'log.level': 'info',
    message: 'hello world',
    ecs: {
      version: '1.4.0'
    }
  }

  const line = JSON.parse(stringify(ecs))
  t.equal(validate(line), true)
  t.end()
})

test('Bad ecs json (on purpose)', t => {
  const ecs = {
    '@timestamp': 'not a date',
    'log.level': 'info',
    message: true,
    ecs: {
      version: '1.4.0'
    }
  }

  const line = JSON.parse(stringify(ecs))
  t.equal(validate(line), false)
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

    res.setHeader('content-type', 'application/json')
    res.setHeader('content-length', '42')

    // add anchor
    req.url += '#anchor'

    formatHttpRequest(ecs, req)
    formatHttpResponse(ecs, res)

    const line = JSON.parse(stringify(ecs))
    t.ok(validate(line))

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
        headers: { 'content-type': 'application/json' },
        body: { bytes: 42 }
      }
    })

    res.end('ok')
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
  t.deepEqual(after.trace, { id: '1' }, 'trace.id is stringified')
  t.deepEqual(after.transaction, { id: '2' }, 'transaction.id is stringified')
  t.deepEqual(after.span, { id: '3' },
    'span.id is stringified, extra fields are excluded')
  t.end()
})
