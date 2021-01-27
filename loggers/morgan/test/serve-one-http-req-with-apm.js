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
