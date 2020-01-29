// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const test = require('ava')
const sget = require('simple-get')
const validator = require('is-my-json-valid')
const express = require('express')
const morgan = require('morgan')
const stoppable = require('stoppable')
const split = require('split2')
const ecsFormat = require('./')

const validate = validator(require('../../utils/schema.json'))

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
    t.is(line, `{"@timestamp":"${log['@timestamp']}","log":{"level":"info","logger":"morgan"},"message":"${JSON.stringify(log.message).slice(1, -1)}","ecs":{"version":"1.4.0"},"http":{"version":"1.1","request":{"method":"post","headers":{"accept-encoding":"gzip, deflate","content-type":"application/json","host":"${log.http.request.headers.host}","connection":"close"},"body":{"bytes":17}},"response":{"status_code":200}},"url":{"path":"/","domain":"localhost","query":"foo=bar","full":"/?foo=bar"},"user_agent":{"original":"cool-agent"}}`)
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
