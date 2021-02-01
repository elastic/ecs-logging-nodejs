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

// Test integration with Elastic APM.

const http = require('http')
const path = require('path')
const { execFile, spawn } = require('child_process')
const zlib = require('zlib')

const addFormats = require('ajv-formats').default
const Ajv = require('ajv').default
const split = require('split2')
const test = require('tap').test

const { ecsLoggingValidate } = require('../../../utils/lib/ecs-logging-validate')

const ajv = new Ajv({
  allErrors: true,
  verbose: true
})
addFormats(ajv)
const validate = ajv.compile(require('../../../utils/schema.json'))

test('tracing integration works', t => {
  let apmServer
  let app
  let appIsClosed = false
  const traceObjs = []
  const logObjs = []
  let stderr = ''

  // 1. Setup a mock APM server to accept trace data. Callback when listening.
  //    Pass intake data to `collectTracesLogsAndCheck()`.
  function step1StartMockApmServer (cb) {
    apmServer = http.createServer(function apmServerReq (req, res) {
      t.equal(req.method, 'POST')
      t.equal(req.url, '/intake/v2/events')
      let instream = req
      if (req.headers['content-encoding'] === 'gzip') {
        instream = req.pipe(zlib.createGunzip())
      } else {
        instream.setEncoding('utf8')
      }
      instream.pipe(split(JSON.parse)).on('data', function (traceObj) {
        collectTracesLogsAndCheck(traceObj, null)
      })
      req.on('end', function () {
        res.end('ok')
      })
    })
    apmServer.listen(0, function () {
      cb(null, 'http://localhost:' + apmServer.address().port)
    })
  }

  // 2. Start a test app that uses APM and our mock APM Server.
  //    Callback on first log line, which includes the app's HTTP address.
  //    Pass parsed JSON log records to `collectTracesLogsAndCheck()`.
  function step2StartApp (apmServerUrl, cb) {
    app = spawn(
      process.execPath,
      [
        path.join(__dirname, 'serve-one-http-req-with-apm.js'),
        apmServerUrl
      ]
    )
    let handledFirstLogLine = false
    app.stdout.pipe(split(JSON.parse)).on('data', function (logObj) {
      if (!handledFirstLogLine) {
        handledFirstLogLine = true
        t.equal(logObj.message, 'listening')
        t.ok(logObj.address, 'first listening log line has "address"')
        cb(null, logObj.address)
      } else {
        collectTracesLogsAndCheck(null, logObj)
      }
    })
    app.stderr.on('data', function (chunk) {
      stderr += chunk
    })
    app.on('close', function (code) {
      t.equal(stderr, '', 'empty stderr from app')
      t.equal(code, 0, 'app exited 0')
      appIsClosed = true
    })
  }

  // 3. Call the test app to generate a trace.
  function step3CallApp (appUrl, cb) {
    const req = http.request(appUrl + '/', function (res) {
      res.on('data', function () {})
      res.on('end', cb)
    })
    req.on('error', cb)
    req.end()
  }

  // 4. Collect trace data from the APM Server, log data from the app, and when
  // all the expected data is collected, then test it: assert matching tracing
  // IDs.
  function collectTracesLogsAndCheck (traceObj, logObj) {
    if (traceObj) {
      traceObjs.push(traceObj)
    }
    if (logObj) {
      t.ok(validate(logObj), 'logObj is ECS valid')
      t.equal(ecsLoggingValidate(logObj), null)
      logObjs.push(logObj)
    }
    if (traceObjs.length >= 3 && logObjs.length >= 1) {
      t.ok(traceObjs[0].metadata, 'traceObjs[0] is metadata')
      t.ok(traceObjs[1].transaction, 'traceObjs[1] is transaction')
      t.ok(traceObjs[2].span, 'traceObjs[2] is span')
      const span = traceObjs[2].span
      t.equal(logObjs[0].trace.id, span.trace_id, 'trace.id matches')
      t.equal(logObjs[0].transaction.id, span.transaction_id, 'transaction.id matches')
      t.equal(logObjs[0].span.id, span.id, 'span.id matches')
      t.equal(logObjs[0].service.name, 'test-apm')
      t.equal(logObjs[0].event.dataset, 'test-apm.log')
      finish()
    }
  }

  function finish () {
    if (appIsClosed) {
      apmServer.close(function () {
        t.end()
      })
    } else {
      app.on('close', function () {
        apmServer.close(function () {
          t.end()
        })
      })
    }
  }

  step1StartMockApmServer(function onListening (apmServerErr, apmServerUrl) {
    t.ifErr(apmServerErr)
    if (apmServerErr) {
      finish()
      return
    }
    t.ok(apmServerUrl, 'apmServerUrl: ' + apmServerUrl)

    step2StartApp(apmServerUrl, function onReady (appErr, appUrl) {
      t.ifErr(appErr)
      if (appErr) {
        finish()
        return
      }
      t.ok(appUrl, 'appUrl: ' + appUrl)

      step3CallApp(appUrl, function (clientErr) {
        t.ifErr(clientErr)

        // The thread of control now is expected to be in
        // `collectTracesLogsAndCheck()`.
      })
    })
  })
})

test('can override service.name, event.dataset', t => {
  execFile(process.execPath, [
    path.join(__dirname, 'use-apm-override-service-name.js'),
    'test-apm'
  ], {
    timeout: 5000
  }, function (err, stdout, stderr) {
    t.ifErr(err)
    const recs = stdout.trim().split(/\n/g).map(JSON.parse)
    t.equal(recs[0].service.name, 'myname')
    t.equal(recs[0].event.dataset, 'mydataset')
    t.equal(recs[1].service.name, 'test-apm')
    t.equal(recs[1].event.dataset, 'test-apm.log')
    t.end()
  })
})

test('unset APM serviceName does not set service.name, event.dataset, but also does not break', t => {
  execFile(process.execPath, [
    path.join(__dirname, 'use-apm-override-service-name.js')
    // Leave <serviceName> arg empty.
  ], {
    timeout: 5000,
    // Ensure the APM Agent's auto-configuration of `serviceName`, via looking
    // up dirs for a package.json, does *not* work by execing from the root dir.
    cwd: '/'
  }, function (err, stdout, stderr) {
    t.ifErr(err)
    const recs = stdout.trim().split(/\n/g).map(JSON.parse)
    t.equal(recs[0].service.name, 'myname')
    t.equal(recs[0].event.dataset, 'mydataset')
    t.equal(recs[1].service, undefined)
    t.equal(recs[1].event, undefined)
    t.end()
  })
})
