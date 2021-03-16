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

const morgan = require('morgan')
const {
  version,
  stringify,
  formatHttpRequest,
  formatHttpResponse
} = require('@elastic/ecs-helpers')

// We will query the Elastic APM agent if it is available.
let elasticApm = null
try {
  elasticApm = require('elastic-apm-node')
} catch (ex) {
  // Silently ignore.
}

// Return a Morgan formatter function for ecs-logging output.
//
// @param {Object} opts - Optional.
//    - {String || Function} opts.format - A format *name* (e.g. 'combined'),
//      format function (e.g. `morgan.combined`), or a format string
//      (e.g. ':method :url :status'). This is used to format the "message"
//      field. Defaults to `morgan.combined`.
//    - {Boolean} opts.apmIntegration - Whether to automatically integrate with
//      Elastic APM (https://github.com/elastic/apm-agent-nodejs). If a started
//      APM agent is detected, then log records will include the following
//      fields:
//        - "service.name" - the configured serviceName in the agent
//        - "event.dataset" - set to "$serviceName.log" for correlation in Kibana
//        - "trace.id", "transaction.id", and "span.id" - if there is a current
//          active trace when the log call is made
//      Default true.
//
// For backwards compatibility, the first argument can be a String or Function
// to specify `opts.format`. For example, the following are equivalent:
//    ecsFormat({format: 'combined'})
//    ecsFormat('combined')
// The former allows specifying other options.
function ecsFormat (opts) {
  let format = morgan.combined
  let apmIntegration = true
  if (opts && typeof opts === 'object') {
    // Usage: ecsFormat({ /* opts */ })
    if (hasOwnProperty.call(opts, 'format')) {
      format = opts.format
    }
    if (hasOwnProperty.call(opts, 'apmIntegration')) {
      apmIntegration = opts.apmIntegration
    }
  } else if (opts) {
    // Usage: ecsFormat(format)
    format = opts
  }

  // Resolve to a format function a la morgan's own `getFormatFunction`.
  let fmt = morgan[format] || format
  if (typeof fmt !== 'function') {
    fmt = morgan.compile(fmt)
  }

  let apm = null
  if (apmIntegration && elasticApm && elasticApm.isStarted && elasticApm.isStarted()) {
    apm = elasticApm
  }

  let serviceField
  let eventField
  if (apm) {
    // https://github.com/elastic/apm-agent-nodejs/pull/1949 is adding
    // getServiceName() in v3.11.0. Fallback to private `apm._conf`.
    // istanbul ignore next
    const serviceName = apm.getServiceName
      ? apm.getServiceName()
      : apm._conf.serviceName
    // A mis-configured APM Agent can be "started" but not have a
    // "serviceName".
    // istanbul ignore else
    if (serviceName) {
      serviceField = { name: serviceName }
      eventField = { dataset: serviceName + '.log' }
    }
  }

  return function formatter (token, req, res) {
    const ecsFields = {
      '@timestamp': new Date().toISOString(),
      'log.level': res.statusCode < 500 ? 'info' : 'error',
      message: fmt(token, req, res),
      ecs: { version }
    }

    if (serviceField) {
      ecsFields.service = serviceField
    }
    if (eventField) {
      ecsFields.event = eventField
    }

    // https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html
    if (apm) {
      const tx = apm.currentTransaction
      // istanbul ignore else
      if (tx) {
        ecsFields.trace = ecsFields.trace || {}
        ecsFields.trace.id = tx.traceId
        ecsFields.transaction = ecsFields.transaction || {}
        ecsFields.transaction.id = tx.id
        // Not including `span.id` because the way morgan logs (on the HTTP
        // Response "finished" event), any spans during the request handler
        // are no longer active.
      }
    }

    // https://www.elastic.co/guide/en/ecs/current/ecs-http.html
    formatHttpRequest(ecsFields, req)
    formatHttpResponse(ecsFields, res)

    return stringify(ecsFields)
  }
}

module.exports = ecsFormat
