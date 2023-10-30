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

// Test the various error/exception handling cases.

const { execFile } = require('child_process')
const semver = require('semver')
const test = require('tap').test
const { MESSAGE } = require('triple-beam')
const winston = require('winston')
const { ecsLoggingValidate } = require('../../../utils/lib/ecs-logging-validate')
const { validate, CaptureTransport } = require('./utils')

const { ecsFormat } = require('../')

// https://nodejs.org/en/blog/release/v16.9.0
const IS_ERROR_CAUSE_SUPPORTED = semver.satisfies(process.version, '>=16.9.0')

const TEST_SKIP_SLOW = ['1', 'true'].includes(process.env.TEST_SKIP_SLOW)

test('log.info("msg", new Error("boom"))', t => {
  const cap = new CaptureTransport()
  const log = winston.createLogger({
    // Set `convertErr: false` to ensure this form of passing an Error to
    // a Winston logger is handled by default.
    format: ecsFormat({ convertErr: false }),
    defaultMeta: { aField: 'defaultMeta field value' },
    transports: [cap]
  })

  const errCause = new Error('the cause')
  const err = new Error('boom', { cause: errCause })
  err.aField = 'err field value'
  log.info('msg', err)

  const rec = cap.records[0]
  t.ok(validate(rec))
  t.equal(ecsLoggingValidate(cap.infos[0][MESSAGE], { ignoreIndex: true }), null)
  t.equal(rec.message, 'msg boom') // Winston core appends the err.message to the message.
  // Ideally we'd expect `aField: 'defaultMeta field value'`, but Winston
  // core error handling overwrites with `err.aField`. The ECS formatter
  // moves that err property from the record top-level to `error.`.
  t.equal(rec.aField, undefined, 'aField')
  t.equal(rec.error.type, 'Error', 'error.type')
  t.equal(rec.error.message, 'boom', 'error.message')
  t.match(rec.error.stack_trace, /^Error: boom\n {4}at/, 'error.stack_trace')
  t.equal(rec.error.aField, 'err field value', 'error.aField')
  if (IS_ERROR_CAUSE_SUPPORTED) {
    t.match(rec.error.cause, /^Error: the cause\n {4}at/, 'error.cause')
  }
  t.end()
})

if (!TEST_SKIP_SLOW) {
  test('uncaughtException winston log error message', t => {
    execFile(
      process.execPath,
      ['uncaught-exception.js'],
      {
        cwd: __dirname,
        timeout: 5000
      },
      function (err, stdout, _stderr) {
        t.ok(err, 'script exited non-zero')
        const recs = stdout.trim().split(/\n/g).map(JSON.parse)
        t.equal(recs.length, 1)
        const rec = recs[0]
        t.equal(rec['log.level'], 'error', 'log.level')
        t.equal(rec.message, 'uncaughtException: funcb boom', 'message')
        t.equal(rec.error.type, 'Error', 'error.type')
        t.equal(rec.error.message, 'funcb boom', 'error.message')
        t.match(rec.error.stack_trace, /^Error: funcb boom\n {4}at/, 'error.stack_trace')
        t.equal(rec.error.code, 42, 'error.code')
        t.equal(rec.exception, true, 'exception')
        t.end()
      }
    )
  })

  test('unhandledRejection winston log error message', t => {
    execFile(
      process.execPath,
      ['unhandled-rejection.js'],
      {
        cwd: __dirname,
        timeout: 5000
      },
      function (err, stdout, _stderr) {
        t.ok(err, 'script exited non-zero')
        const recs = stdout.trim().split(/\n/g).map(JSON.parse)
        t.equal(recs.length, 1)
        const rec = recs[0]
        t.equal(rec['log.level'], 'error', 'log.level')
        t.equal(rec.message, 'unhandledRejection: funcb boom', 'message')
        t.equal(rec.error.type, 'Error', 'error.type')
        t.equal(rec.error.message, 'funcb boom', 'error.message')
        t.match(rec.error.stack_trace, /^Error: funcb boom\n {4}at/, 'error.stack_trace')
        t.equal(rec.error.code, 42, 'error.code')
        t.equal(rec.exception, true, 'exception')
        t.end()
      }
    )
  })
}

test('log.info(new Error("boom"))', t => {
  const cap = new CaptureTransport()
  const log = winston.createLogger({
    format: ecsFormat({ convertErr: true }),
    defaultMeta: { aField: 'defaultMeta field value' },
    transports: [cap]
  })

  const errCause = 'the cause is a string'
  const err = new Error('boom', { cause: errCause })
  err.aField = 'err field value'
  log.info(err)

  const rec = cap.records[0]
  t.ok(validate(rec))
  t.equal(ecsLoggingValidate(cap.infos[0][MESSAGE], { ignoreIndex: true }), null)
  t.equal(rec.message, 'boom', 'message')
  t.equal(rec.aField, 'defaultMeta field value', 'aField')
  t.equal(rec.error.type, 'Error', 'error.type')
  t.equal(rec.error.message, 'boom', 'error.message')
  t.match(rec.error.stack_trace, /^Error: boom\n {4}at/, 'error.stack_trace')
  // Winston mixes `err` properties and `defaultMeta` at the top-level, so
  // conflicts result in lost data.
  t.equal(rec.error.aField, 'defaultMeta field value', 'error.aField')
  if (IS_ERROR_CAUSE_SUPPORTED) {
    t.equal(rec.error.cause, 'the cause is a string', 'error.cause')
  }
  t.end()
})

test('log.info(new Error("boom"), {...})', t => {
  const cap = new CaptureTransport()
  const log = winston.createLogger({
    format: ecsFormat({ convertErr: true }),
    defaultMeta: { aField: 'defaultMeta field value' },
    transports: [cap]
  })

  const errCause = new Error('the cause')
  const err = new Error('boom', { cause: errCause })
  err.aField = 'err field value'
  log.info(err, { aField: 'splat field value' })

  const rec = cap.records[0]
  t.ok(validate(rec))
  t.equal(ecsLoggingValidate(cap.infos[0][MESSAGE], { ignoreIndex: true }), null)
  t.equal(rec.message, 'boom', 'message')
  t.equal(rec.aField, 'splat field value', 'aField')
  t.equal(rec.error.type, 'Error', 'error.type')
  t.equal(rec.error.message, 'boom', 'error.message')
  t.match(rec.error.stack_trace, /^Error: boom\n {4}at/, 'error.stack_trace')
  t.equal(rec.error.aField, 'err field value', 'error.aField')
  if (IS_ERROR_CAUSE_SUPPORTED) {
    t.match(rec.error.cause, /^Error: the cause\n {4}at/, 'error.cause')
  }
  t.end()
})

test('log.info(new Error("")) with empty err.message', t => {
  const cap = new CaptureTransport()
  const log = winston.createLogger({
    format: ecsFormat({ convertErr: true }),
    defaultMeta: { aField: 'defaultMeta field value' },
    transports: [cap]
  })

  const errCause = new Error('the cause')
  const err = new Error('', { cause: errCause })
  err.aField = 'err field value'
  log.info(err)

  const rec = cap.records[0]
  t.ok(validate(rec))
  t.equal(ecsLoggingValidate(cap.infos[0][MESSAGE], { ignoreIndex: true }), null)
  t.equal(rec.message, '', 'message')
  t.equal(rec.aField, 'defaultMeta field value', 'aField')
  t.equal(rec.error.type, 'Error', 'error.type')
  t.equal(rec.error.message, '', 'error.message')
  t.match(rec.error.stack_trace, /^Error: \n {4}at/, 'error.stack_trace')
  t.equal(rec.error.aField, 'err field value', 'error.aField')
  if (IS_ERROR_CAUSE_SUPPORTED) {
    t.match(rec.error.cause, /^Error: the cause\n {4}at/, 'error.cause')
  }
  t.end()
})

test('log.info("msg", { err: new Error("boom") })', t => {
  const cap = new CaptureTransport()
  const log = winston.createLogger({
    format: ecsFormat({ convertErr: true }),
    defaultMeta: { aField: 'defaultMeta field value' },
    transports: [cap]
  })

  const errCause = new Error('the cause')
  const err = new Error('boom', { cause: errCause })
  err.aField = 'err field value'
  log.info('msg', { err, aField: 'splat field value' })

  const rec = cap.records[0]
  t.ok(validate(rec))
  t.equal(ecsLoggingValidate(cap.infos[0][MESSAGE], { ignoreIndex: true }), null)
  t.equal(rec.message, 'msg', 'message')
  t.equal(rec.aField, 'splat field value', 'aField')
  t.equal(rec.error.type, 'Error', 'error.type')
  t.equal(rec.error.message, 'boom', 'error.message')
  t.match(rec.error.stack_trace, /^Error: boom\n {4}at/, 'error.stack_trace')
  t.equal(rec.error.aField, 'err field value', 'error.aField')
  if (IS_ERROR_CAUSE_SUPPORTED) {
    t.match(rec.error.cause, /^Error: the cause\n {4}at/, 'error.cause')
  }
  t.end()
})
