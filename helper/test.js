'use strict'

const http = require('http')
const test = require('ava')
const validator = require('is-my-json-valid')
const sget = require('simple-get')
const stoppable = require('stoppable')
const {
  stringify,
  formatHttpRequest,
  formatHttpResponse
} = require('./')

const validate = validator(require('../utils/schema.json'))

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

    formatHttpRequest(ecs, req)
    formatHttpResponse(ecs, res)

    const line = JSON.parse(stringify(ecs))
    t.true(validate(line))

    res.end('ok')
  }
})
