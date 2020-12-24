// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const http = require('http')
const test = require('ava')
const sget = require('simple-get')
const stoppable = require('stoppable')
const winston = require('winston')
const Transport = require('winston-transport')
const { MESSAGE } = require('triple-beam')
const Ajv = require('ajv')
const { version } = require('@elastic/ecs-helpers')

const ecsFormat = require('./')

const ajv = Ajv({
  allErrors: true,
  verbose: true,
  format: 'full'
})
const validate = ajv.compile(require('../../utils/schema.json'))

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
      line['@timestamp'] = true
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

test('Should not change the message', t => {
  t.plan(1)

  class TestTransport extends Transport {
    log (info, callback) {
      const line = JSON.parse(info[MESSAGE])
      t.is(line.message, 'ecs is cool!')
      callback()
    }
  }

  const logger = winston.createLogger({
    level: 'info',
    format: ecsFormat(),
    transports: [new TestTransport()]
  })

  logger.info('ecs is cool!')
})

test('Should not change the log level', t => {
  t.plan(1)

  class TestTransport extends Transport {
    log (info, callback) {
      const line = JSON.parse(info[MESSAGE])
      t.is(line['log.level'], 'error')
      callback()
    }
  }

  const logger = winston.createLogger({
    level: 'info',
    format: ecsFormat(),
    transports: [new TestTransport()]
  })

  logger.error('ecs is cool!')
})

test('Should append any additional property to the log message', t => {
  t.plan(2)

  class TestTransport extends Transport {
    log (info, callback) {
      const line = JSON.parse(info[MESSAGE])
      t.is(line.foo, 'bar')
      t.is(line.faz, 'baz')
      callback()
    }
  }

  const logger = winston.createLogger({
    level: 'info',
    format: ecsFormat(),
    transports: [new TestTransport()]
  })

  logger.info('ecs is cool!', { foo: 'bar', faz: 'baz' })
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
    // test also the anchor
    req.url += '#anchor'
    logger.info('incoming request', { req, res })
    res.end('ok')
  }
})

test.cb('http request and response (request, response keys)', t => {
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

  function handler (request, response) {
    // test also the anchor
    request.url += '#anchor'
    logger.info('incoming request', { request, response })
    response.end('ok')
  }
})

test('Keys order', t => {
  t.plan(2)

  var count = 0
  class TestTransport extends Transport {
    log (info, callback) {
      const line = JSON.parse(info[MESSAGE])
      if (count++ === 0) {
        t.is(
          info[MESSAGE],
          `{"@timestamp":"${line['@timestamp']}","log.level":"info","message":"ecs is cool!","ecs":{"version":"${version}"}}`
        )
      } else {
        t.is(
          info[MESSAGE],
          `{"@timestamp":"${line['@timestamp']}","log.level":"error","message":"ecs is cool!","ecs":{"version":"${version}"},"hello":"world"}`
        )
      }
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
