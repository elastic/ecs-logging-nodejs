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

// Test everything that doesn't fit in a separate file.

const http = require('http')
const os = require('os')

const addFormats = require('ajv-formats').default
const Ajv = require('ajv').default
const pino = require('pino')
const split = require('split2')
const test = require('tap').test
const ecsVersion = require('@elastic/ecs-helpers').version

const ecsFormat = require('../')
const { ecsLoggingValidate } = require('../../../utils/lib/ecs-logging-validate')

const ajv = new Ajv({
  allErrors: true,
  verbose: true
})
addFormats(ajv)
const validate = ajv.compile(require('../../../utils/schema.json'))

test('ecsPinoFormat cases', suite => {
  const formatCases = [
    {
      name: 'hello world',
      pinoOpts: ecsFormat(),
      loggingFn: (log) => {
        log.info('Hello, world!')
      },
      rec: {
        'log.level': 'info',
        'process.pid': process.pid,
        'host.hostname': os.hostname(),
        'ecs.version': ecsVersion,
        message: 'Hello, world!'
      }
    },
    {
      name: 'should map "name" to "log.logger"',
      pinoOpts: { name: 'myName', ...ecsFormat() },
      loggingFn: (log) => {
        log.info('hi')
      },
      rec: {
        'log.level': 'info',
        'process.pid': process.pid,
        'host.hostname': os.hostname(),
        'log.logger': 'myName',
        'ecs.version': ecsVersion,
        message: 'hi'
      }
    },
    {
      name: 'should add fields to the record',
      pinoOpts: ecsFormat(),
      loggingFn: (log) => {
        log.info({ foo: 'bar' }, 'hi')
      },
      rec: {
        'log.level': 'info',
        'process.pid': process.pid,
        'host.hostname': os.hostname(),
        'ecs.version': ecsVersion,
        message: 'hi',
        foo: 'bar'
      }
    },
    {
      name: 'can log non-HTTP res & req fields',
      pinoOpts: ecsFormat(),
      loggingFn: (log) => {
        log.info({ req: { id: 42 }, res: { status: 'OK' } }, 'hi')
      },
      rec: {
        'log.level': 'info',
        'process.pid': process.pid,
        'host.hostname': os.hostname(),
        'ecs.version': ecsVersion,
        message: 'hi',
        req: { id: 42 },
        res: { status: 'OK' }
      }
    },
    {
      name: '`base: {}` should avoid "process" and "host" fields',
      pinoOpts: { base: {}, ...ecsFormat() },
      loggingFn: (log) => {
        log.info('hi')
      },
      rec: {
        'log.level': 'info',
        'ecs.version': ecsVersion,
        message: 'hi'
      }
    },
    {
      // The pino docs suggest:
      // > `base`
      // > Set to `null` to avoid adding `pid`, `hostname` and `name` properties to each log.
      //
      // This results in a given `formatters.bindings` **not getting called** at
      // all. In earlier versions of this package, that `formatters.bindings`
      // was used to add fields like "ecs.version".
      name: '`base: null` should not break ecs-logging format',
      pinoOpts: { base: null, ...ecsFormat() },
      loggingFn: (log) => {
        log.info('hi')
      },
      rec: {
        'log.level': 'info',
        'ecs.version': ecsVersion,
        message: 'hi'
      }
    },
    {
      name: 'no message in log call should be fine',
      pinoOpts: ecsFormat(),
      loggingFn: (log) => {
        log.info({ foo: 'bar' })
      },
      rec: {
        'log.level': 'info',
        'process.pid': process.pid,
        'host.hostname': os.hostname(),
        'ecs.version': ecsVersion,
        foo: 'bar'
      }
    }
  ]

  formatCases.forEach((fc) => {
    suite.test('ecsPinoFormat case: ' + fc.name, t => {
      const lines = []
      const capture = split().on('data', line => { lines.push(line) })
      const log = pino(fc.pinoOpts, capture)

      fc.loggingFn(log)

      const rec = JSON.parse(lines[0])
      t.ok(validate(rec))
      t.equal(ecsLoggingValidate(lines[0], { ignoreIndex: true }), null)

      delete rec['@timestamp'] // normalize before comparison
      t.strictSame(rec, fc.rec, 'logged record matches expected record')

      t.end()
    })
  })

  suite.end()
})

test('convertReqRes:true and HTTP req, res', t => {
  t.plan(7)

  const stream = split().on('data', line => {
    const rec = JSON.parse(line)
    t.ok(validate(rec))
    t.equal(ecsLoggingValidate(line, { ignoreIndex: true }), null)
    if (rec.message === 'handled request') {
      // Spot check that some of the ECS HTTP and User agent fields are there.
      t.equal(rec.http.request.method, 'GET', 'http.request.method')
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

test('convertErr is true by default', t => {
  const lines = []
  const stream = split().on('data', line => { lines.push(line) })
  const log = pino({ ...ecsFormat() }, stream)

  log.info({ err: new Error('boom') }, 'hi')
  const rec = JSON.parse(lines[0])
  t.ok(validate(rec))
  t.equal(ecsLoggingValidate(lines[0], { ignoreIndex: true }), null)
  t.equal(rec.error.type, 'Error')
  t.equal(rec.error.message, 'boom')
  t.match(rec.error.stack_trace, /^Error: boom\n {4}at/)
  t.end()
})

test('convertErr does not blow up on non-Errors', t => {
  const recs = []
  const stream = split(JSON.parse).on('data', rec => { recs.push(rec) })
  const log = pino({ ...ecsFormat() }, stream)

  log.info({ err: 42 }, 'one')
  log.info({ err: false }, 'two')
  log.info({ err: null }, 'three')
  log.info({ err: { foo: 'bar' } }, 'four')
  t.equal(recs[0].err, 42)
  t.equal(recs[1].err, false)
  t.equal(recs[2].err, null)
  t.strictSame(recs[3].err, { foo: 'bar' })
  t.end()
})

test('convertErr=false allows passing through err=<non-Error>', t => {
  const lines = []
  const stream = split().on('data', line => { lines.push(line) })
  // For *coverage* testing we also set `convertReqRes` to ensure
  // createEcsPinoOptions includes a `formatters.log` function.
  const log = pino(
    { ...ecsFormat({ convertErr: false, convertReqRes: true }) },
    stream)

  log.info({ err: 42 }, 'hi')
  const rec = JSON.parse(lines[0])
  t.ok(validate(rec))
  t.equal(ecsLoggingValidate(lines[0], { ignoreIndex: true }), null)
  t.equal(rec.err, 42, 'rec.err is unchanged')
  t.equal(rec.error, undefined, 'no rec.error is set')
  t.end()
})

test('createEcsPinoOptions with no formatters.log', t => {
  // There is a supposed fast path in createEcsPinoOptions where formatters.log
  // is excluded. Since convertErr is true by default, this case is rare.
  // For coverage testing, we concoct that case here.
  const lines = []
  const stream = split().on('data', line => { lines.push(line) })
  const log = pino({ ...ecsFormat({ convertErr: false }) }, stream)

  log.info({ err: 42, req: 'my req', res: null }, 'hi')
  const rec = JSON.parse(lines[0])
  t.ok(validate(rec))
  t.equal(ecsLoggingValidate(lines[0], { ignoreIndex: true }), null)
  t.equal(rec.err, 42)
  t.equal(rec.req, 'my req')
  t.equal(rec.res, null)
  t.end()
})
