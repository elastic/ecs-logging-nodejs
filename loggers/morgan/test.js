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
