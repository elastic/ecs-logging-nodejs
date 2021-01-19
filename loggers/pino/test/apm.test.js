// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

// Test integration with Elastic APM.

const http = require('http')
const path = require('path')
const { spawn } = require('child_process')
const zlib = require('zlib')

const Ajv = require('ajv')
const split = require('split2')
const test = require('tap').test

const ajv = Ajv({
  allErrors: true,
  verbose: true,
  format: 'full'
})
const validate = ajv.compile(require('../../../utils/schema.json'))

test('tracing integration works', t => {
  let apmServer
  let app
  const traceObjs = []
  const logObjs = []
  let stderr = ''

  // 1. Setup a mock APM server to accept trace data. Callback when listening.
  //    Pass intake data to `collectTracesLogsAndCheck()`.
  function step1StartMockApmServer (cb) {
    apmServer = http.createServer(function apmServerReq (req, res) {
      t.equal(req.method, 'POST')
      t.equal(req.url, '/intake/v2/events')
      var instream = req
      if (req.headers['content-encoding'] === 'gzip') {
        instream = req.pipe(zlib.createGunzip())
      } else {
        instream.setEncoding('utf8')
      }
      instream.pipe(split(JSON.parse)).on('data', function (traceObj) {
        collectTracesLogsAndCheck(traceObj, null)
      })
      req.on('close', function () {
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
      finish()
    }
  }

  function finish () {
    app.on('close', function () {
      apmServer.close(function () {
        t.end()
      })
    })
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
