// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const { MESSAGE } = require('triple-beam')
const { format } = require('winston')
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

const reservedFields = {
  level: true,
  'log.level': true,
  ecs: true,
  '@timestamp': true,
  req: true,
  res: true
}

// https://github.com/winstonjs/winston#creating-custom-formats
function ecsTransform (info, opts) {
  var ecsFields = {
    '@timestamp': new Date().toISOString(),
    'log.level': info.level,
    message: info.message,
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
      const span = elasticApm.currentSpan
      // istanbul ignore else
      if (span) {
        ecsFields.span = ecsFields.span || {}
        ecsFields.span.id = span.id
      }
    }
  }

  // https://www.elastic.co/guide/en/ecs/current/ecs-http.html
  if (info.req) {
    if (opts.convertReqRes) {
      formatHttpRequest(ecsFields, info.req)
    } else {
      ecsFields.req = info.req
    }
  }
  if (info.res) {
    if (opts.convertReqRes) {
      formatHttpResponse(ecsFields, info.res)
    } else {
      ecsFields.res = info.res
    }
  }

  var keys = Object.keys(info)
  for (var i = 0, len = keys.length; i < len; i++) {
    var key = keys[i]
    if (!reservedFields[key]) {
      ecsFields[key] = info[key]
    }
  }

  info[MESSAGE] = stringify(ecsFields)
  return info
}

module.exports = format(ecsTransform)
