// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

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

function ecsFormat (format = morgan.combined) {
  // `format` is a format *name* (e.g. 'combined'), format function (e.g.
  // `morgan.combined`), or a format string (e.g. ':method :url :status')
  // Resolve this to a format function a la morgan's own `getFormatFunction`.
  let fmt = morgan[format] || format
  if (typeof fmt !== 'function') {
    fmt = morgan.compile(fmt)
  }

  // If there is a *started* APM agent, then use it.
  const apm = elasticApm && elasticApm.isStarted() ? elasticApm : null
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
    var ecsFields = {
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
