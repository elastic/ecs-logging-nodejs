// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

// This script is used to test @elastic/ecs-morgan-format + APM.
//
// It will:
// - configure APM using the given APM server url (first arg)
// - start an HTTP server
// - log once when it is listening (with its address)
// - handle a single HTTP request
// - log that request
// - flush APM (i.e. ensure it has sent its data to its configured APM server)
// - exit

const serverUrl = process.argv[2]
/* eslint-disable-next-line no-unused-vars */
const apm = require('elastic-apm-node').start({
  serverUrl,
  serviceName: 'test-apm',
  centralConfig: false,
  captureExceptions: false,
  metricsInterval: 0
})

const app = require('express')()
const http = require('http')
const morgan = require('morgan')
const ecsFormat = require('../') // @elastic/ecs-morgan-format

app.use(morgan(ecsFormat()))

app.get('/', function (req, res) {
  res.once('finish', function apmFlushAndExit () {
    apm.flush(function onFlushed () {
      server.close()
    })
  })
  res.end('ok')
})

const server = http.createServer(app)
server.listen(0, () => {
  // A faux log output line as required by "apm.test.js".
  console.log(JSON.stringify({
    message: 'listening',
    address: `http://localhost:${server.address().port}`
  }))
})
