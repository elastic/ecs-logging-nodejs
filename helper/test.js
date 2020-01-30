// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const http = require('http')
const test = require('ava')
const Ajv = require('ajv')
const sget = require('simple-get')
const stoppable = require('stoppable')
const {
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

test('Stringify should return a valid ecs json', t => {
  const ecs = {
    '@timestamp': new Date().toISOString(),
    log: {
      level: 'info',
      logger: 'test'
    },
    message: 'hello world',
    ecs: {
      version: '1.4.0'
    }
  }

  const line = JSON.parse(stringify(ecs))
  t.true(validate(line))
})

test('Bad ecs json (on purpose)', t => {
  const ecs = {
    '@timestamp': 'not a date',
    log: {
      level: 'info',
      logger: 'test'
    },
    message: true,
    ecs: {
      version: '1.4.0'
    }
  }

  const line = JSON.parse(stringify(ecs))
  t.false(validate(line))
})

test.cb('formatHttpRequest and formatHttpResponse should returna valid ecs object', t => {
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
    const ecs = {
      '@timestamp': new Date().toISOString(),
      log: {
        level: 'info',
        logger: 'test'
      },
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
    t.true(validate(line))

    t.deepEqual(line.user_agent, { original: 'cool-agent' })
    t.deepEqual(line.url, {
      path: '/',
      query: 'foo=bar',
      full: '/?foo=bar#anchor',
      fragment: 'anchor'
    })
    t.deepEqual(line.http, {
      version: '1.1',
      request: {
        method: 'post',
        headers: {
          'accept-encoding': 'gzip, deflate',
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
