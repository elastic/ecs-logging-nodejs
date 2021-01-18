// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const http = require('http')

const test = require('ava')
const sget = require('simple-get')
const Ajv = require('ajv')
const express = require('express')
const morgan = require('morgan')
const stoppable = require('stoppable')
const split = require('split2')
const { version } = require('@elastic/ecs-helpers')

const ecsFormat = require('./')

const ajv = Ajv({
  allErrors: true,
  verbose: true,
  format: 'full'
})
const validate = ajv.compile(require('../../utils/schema.json'))

test.cb('Should produce valid ecs logs', t => {
  t.plan(2)

  const stream = split(JSON.parse).on('data', line => {
    t.true(validate(line))
  })

  const app = express()
  app.use(morgan(ecsFormat(), { stream }))
  app.use('/', (req, res) => {
    res.end('ok')
  })

  const server = stoppable(app.listen(0, () => {
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
  }))
})

test.cb('Keys order', t => {
  t.plan(2)

  const stream = split().on('data', line => {
    const log = JSON.parse(line)
    t.is(line, `{"@timestamp":"${log['@timestamp']}","log.level":"info","message":"${JSON.stringify(log.message).slice(1, -1)}","ecs":{"version":"${version}"},"http":{"version":"1.1","request":{"method":"post","headers":{"accept-encoding":"gzip, deflate","content-type":"application/json","host":"${log.http.request.headers.host}","connection":"close"},"body":{"bytes":17}},"response":{"status_code":200,"headers":{"x-powered-by":"Express"}}},"url":{"path":"/","domain":"localhost","query":"foo=bar","full":"http://localhost:${server.address().port}/?foo=bar"},"user_agent":{"original":"cool-agent"}}`)
  })

  const app = express()
  app.use(morgan(ecsFormat(), { stream }))
  app.use('/', (req, res) => {
    res.end('ok')
  })

  const server = stoppable(app.listen(0, () => {
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
  }))
})

test.cb('"format" argument - format name', t => {
  t.plan(1)

  // Example:
  //  GET /?foo=bar 200 - - 0.073 ms
  const format = 'tiny' // https://github.com/expressjs/morgan#tiny
  const msgRe = /^GET \/\?foo=bar 200 - - \d+\.\d+ ms$/
  const stream = split().on('data', line => {
    const rec = JSON.parse(line)
    t.true(msgRe.test(rec.message),
      `rec.message ${JSON.stringify(rec.message)} matches ${msgRe}`)
  })

  // Express app using the given morgan `format`.
  const app = express()
  app.use(morgan(ecsFormat(format), { stream }))
  app.use('/', (req, res) => {
    res.end('ok')
  })

  // Make a request, then end the test.
  const server = app.listen(0, () => {
    const req = http.request(
      `http://localhost:${server.address().port}?foo=bar`,
      function (res) {
        res.on('data', function () {})
        res.on('close', function () {
          server.close(function () {
            t.end()
          })
        })
      }
    )
    req.end()
  })
})

test.cb('"format" argument - format string', t => {
  t.plan(1)

  // Example:
  //  GET /?foo=bar 200
  const format = ':method :url :status'
  const msgRe = /^GET \/\?foo=bar 200$/
  const stream = split().on('data', line => {
    const rec = JSON.parse(line)
    t.true(msgRe.test(rec.message),
      `rec.message ${JSON.stringify(rec.message)} matches ${msgRe}`)
  })

  // Express app using the given morgan `format`.
  const app = express()
  app.use(morgan(ecsFormat(format), { stream }))
  app.use('/', (req, res) => {
    res.end('ok')
  })

  // Make a request, then end the test.
  const server = app.listen(0, () => {
    const req = http.request(
      `http://localhost:${server.address().port}?foo=bar`,
      function (res) {
        res.on('data', function () {})
        res.on('close', function () {
          server.close(function () {
            t.end()
          })
        })
      }
    )
    req.end()
  })
})

test.cb('"format" argument - format function', t => {
  t.plan(1)

  // Example:
  //  GET /?foo=bar 200 - - 0.073 ms
  const format = morgan.tiny
  const msgRe = /^GET \/\?foo=bar 200 - - \d+\.\d+ ms$/
  const stream = split().on('data', line => {
    const rec = JSON.parse(line)
    t.true(msgRe.test(rec.message),
      `rec.message ${JSON.stringify(rec.message)} matches ${msgRe}`)
  })

  // Express app using the given morgan `format`.
  const app = express()
  app.use(morgan(ecsFormat(format), { stream }))
  app.use('/', (req, res) => {
    res.end('ok')
  })

  // Make a request, then end the test.
  const server = app.listen(0, () => {
    const req = http.request(
      `http://localhost:${server.address().port}?foo=bar`,
      function (res) {
        res.on('data', function () {})
        res.on('close', function () {
          server.close(function () {
            t.end()
          })
        })
      }
    )
    req.end()
  })
})
