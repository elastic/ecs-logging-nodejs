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

  // Add all unreserved fields.
  var keys = Object.keys(info)
  for (var i = 0, len = keys.length; i < len; i++) {
    var key = keys[i]
    if (!reservedFields[key]) {
      ecsFields[key] = info[key]
    }
  }

  // If there is a *started* APM agent, then use it.
  const apm = elasticApm && elasticApm.isStarted() ? elasticApm : null

  // istanbul ignore else
  if (apm) {
    // Set "service.name" and "event.dataset" from APM conf, if not already set.
    let serviceName = ecsFields.service && ecsFields.service.name
    if (!serviceName) {
      // https://github.com/elastic/apm-agent-nodejs/pull/1949 is adding
      // getServiceName() in v3.11.0. Fallback to private `apm._conf`.
      // istanbul ignore next
      serviceName = apm.getServiceName
        ? apm.getServiceName()
        : apm._conf.serviceName
      // A mis-configured APM Agent can be "started" but not have a
      // "serviceName".
      if (serviceName) {
        ecsFields.service = ecsFields.service || {}
        ecsFields.service.name = serviceName
      }
    }
    if (serviceName && !(ecsFields.event && ecsFields.event.dataset)) {
      ecsFields.event = ecsFields.event || {}
      ecsFields.event.dataset = serviceName + '.log'
    }

    // https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html
    const tx = apm.currentTransaction
    if (tx) {
      ecsFields.trace = ecsFields.trace || {}
      ecsFields.trace.id = tx.traceId
      ecsFields.transaction = ecsFields.transaction || {}
      ecsFields.transaction.id = tx.id
      const span = apm.currentSpan
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

  info[MESSAGE] = stringify(ecsFields)
  return info
}

module.exports = format(ecsTransform)
