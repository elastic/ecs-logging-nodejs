// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

// This script is used to test @elastic/ecs-pino-format + APM.
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

const http = require('http')
const ecsFormat = require('../') // @elastic/ecs-winston-format
const winston = require('winston')

const log = winston.createLogger({
  level: 'info',
  format: ecsFormat({ convertReqRes: true }),
  transports: [
    new winston.transports.Console()
  ]
})

const server = http.createServer()

server.once('request', function handler (req, res) {
  const span = apm.startSpan('auth')
  setImmediate(function doneAuth () {
    span.end()
    res.end('ok')
    log.info('handled request', { req, res })
    apm.flush(function onFlushed () {
      server.close()
    })
  })
})

server.listen(0, () => {
  log.info('listening', { address: `http://localhost:${server.address().port}` })
})
