'use strict'

const http = require('http')
const test = require('ava')
const sget = require('simple-get')
const stoppable = require('stoppable')
const winston = require('winston')
const Transport = require('winston-transport')
const { MESSAGE } = require('triple-beam')
const validator = require('is-my-json-valid')
const ecsFormat = require('./')

const validate = validator(require('../../utils/schema.json'))

test('Should produce valid ecs logs', t => {
  t.plan(2)

  class TestTransport extends Transport {
    log (info, callback) {
      const line = JSON.parse(info[MESSAGE])
      t.true(validate(line))
      callback()
    }
  }

  const logger = winston.createLogger({
    level: 'info',
    format: ecsFormat(),
    transports: [new TestTransport()]
  })

  logger.info('ecs is cool!')
  logger.error('ecs is cool!', { hello: 'world' })
})

test('Bad ecs log (on purpose)', t => {
  t.plan(2)

  class TestTransport extends Transport {
    log (info, callback) {
      const line = JSON.parse(info[MESSAGE])
      line.log.level = true
      t.false(validate(line))
      callback()
    }
  }

  const logger = winston.createLogger({
    level: 'info',
    format: ecsFormat(),
    transports: [new TestTransport()]
  })

  logger.info('ecs is cool!')
  logger.error('ecs is cool!', { hello: 'world' })
})

test.cb('http request and response (req, res keys)', t => {
  t.plan(2)

  class TestTransport extends Transport {
    log (info, callback) {
      const line = JSON.parse(info[MESSAGE])
      t.true(validate(line))
      callback()
    }
  }

  const logger = winston.createLogger({
    level: 'info',
    format: ecsFormat(),
    transports: [new TestTransport()]
  })

  const server = stoppable(http.createServer(handler))
  server.listen(0, () => {
    const body = JSON.stringify({ hello: 'world' })
    sget({
      method: 'POST',
      url: `http://localhost:${server.address().port}`,
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
    logger.info('incoming request', { req, res })
    res.end('ok')
  }
})