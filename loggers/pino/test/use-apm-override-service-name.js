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
