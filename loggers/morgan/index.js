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

  return function formatter (token, req, res) {
    var ecsFields = {
      '@timestamp': new Date().toISOString(),
      'log.level': res.statusCode < 500 ? 'info' : 'error',
      message: fmt(token, req, res),
      ecs: { version }
    }

    // https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html
    // istanbul ignore else
    if (elasticApm) {
      const tx = elasticApm.currentTransaction
      if (tx) {
        ecsFields.trace = ecsFields.trace || {}
        ecsFields.trace.id = tx.traceId
        ecsFields.transaction = ecsFields.transaction || {}
        ecsFields.transaction.id = tx.id
        // Not including `span.id` because the way morgan logs (on the HTTP
        // Response "finished" event), any spans during the request handler
        // are no longer active. Also `span.id` isn't currently mandated by
        // the ecs-logging spec.
      }
    }

    // https://www.elastic.co/guide/en/ecs/current/ecs-http.html
    formatHttpRequest(ecsFields, req)
    formatHttpResponse(ecsFields, res)

    return stringify(ecsFields)
  }
}

module.exports = ecsFormat
