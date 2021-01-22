// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

// This script is used by "apm.test.js".
//
// It will:
// - use the APM agent (using serviceName from argv[2])
// - log, setting service.name and event.dataset
// - log, without setting service.name and event.dataset
// - flush APM and exit

const serviceName = process.argv[2] || ''
require('elastic-apm-node').start({
  // Use default serverUrl (fire and forget)
  serviceName,
  centralConfig: false,
  captureExceptions: false,
  metricsInterval: 0
})

const ecsFormat = require('../') // @elastic/ecs-winston-format
const winston = require('winston')

const log = winston.createLogger({
  level: 'info',
  format: ecsFormat(),
  transports: [
    new winston.transports.Console()
  ]
})

log.info('hi', {
  foo: 'bar',
  service: { name: 'myname' },
  event: { dataset: 'mydataset' }
})
log.info('bye', { foo: 'bar' })
