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
/* eslint-disable-next-line no-unused-vars */
const apm = require('elastic-apm-node').start({
  // Use default serverUrl (fire and forget)
  serviceName,
  centralConfig: false,
  captureExceptions: false,
  metricsInterval: 0
})

const ecsFormat = require('../') // @elastic/ecs-pino-format
const pino = require('pino')

const log = pino({ ...ecsFormat() })
log.info({
  foo: 'bar',
  service: { name: 'myname' },
  event: { dataset: 'mydataset' }
}, 'hi')
log.info({ foo: 'bar' }, 'bye')
