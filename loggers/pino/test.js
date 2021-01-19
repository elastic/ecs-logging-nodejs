// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const http = require('http')
const test = require('tap').test
const Ajv = require('ajv')
const pino = require('pino')
const split = require('split2')
const ecsFormat = require('./')

const ajv = Ajv({
  allErrors: true,
  verbose: true,
  format: 'full'
})
const validate = ajv.compile(require('../../utils/schema.json'))

test('Should produce valid ecs logs', t => {
  const stream = split(JSON.parse).once('data', line => {
    t.deepEqual(line['log.level'], 'info')
    t.ok(validate(line))
    t.end()
  })

  const log = pino({ ...ecsFormat() }, stream)
  log.info('Hello world')
})

test('Should map "name" to "log.logger"', t => {
  const stream = split(JSON.parse).once('data', line => {
    t.deepEqual(line.log, { logger: 'myName' })
    t.ok(validate(line))
    t.end()
  })

  // Pass in empty opts object to ecsFormat() for coverage.
  const log = pino({ name: 'myName', ...ecsFormat({}) }, stream)
  log.info('Hello world')
})

test('Should append any additional property to the log message', t => {
  const stream = split(JSON.parse).once('data', line => {
    t.equal(line.foo, 'bar')
    t.ok(validate(line))
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
  t.plan(5)

  const stream = split(JSON.parse).on('data', rec => {
    t.ok(validate(rec))
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
