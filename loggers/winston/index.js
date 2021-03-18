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

const { MESSAGE } = require('triple-beam')
const { format } = require('winston')
const {
  version,
  stringify,
  formatError,
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
  err: true,
  req: true,
  res: true
}

// Create a Winston format for ecs-logging output.
//
// @param {Object} opts - Optional.
//    - {Boolean} opts.convertErr - Whether to convert a logged `err` field
//      to ECS error fields. Default true.
//    - {Boolean} opts.convertReqRes - Whether to convert logged `req` and `res`
//      HTTP request and response fields to ECS HTTP, User agent, and URL
//      fields. Default false.
//    - {Boolean} opts.apmIntegration - Whether to automatically integrate with
//      Elastic APM (https://github.com/elastic/apm-agent-nodejs). If a started
//      APM agent is detected, then log records will include the following
//      fields:
//        - "service.name" - the configured serviceName in the agent
//        - "event.dataset" - set to "$serviceName.log" for correlation in Kibana
//        - "trace.id", "transaction.id", and "span.id" - if there is a current
//          active trace when the log call is made
//      Default true.
function ecsTransform (info, opts) {
  let convertErr = true
  let convertReqRes = false
  let apmIntegration = true
  // istanbul ignore else
  if (opts) {
    if (hasOwnProperty.call(opts, 'convertErr')) {
      convertErr = opts.convertErr
    }
    if (hasOwnProperty.call(opts, 'convertReqRes')) {
      convertReqRes = opts.convertReqRes
    }
    if (hasOwnProperty.call(opts, 'apmIntegration')) {
      apmIntegration = opts.apmIntegration
    }
  }

  const ecsFields = {
    '@timestamp': new Date().toISOString(),
    'log.level': info.level,
    message: info.message,
    ecs: { version }
  }

  // Add all unreserved fields.
  const keys = Object.keys(info)
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i]
    if (!reservedFields[key]) {
      ecsFields[key] = info[key]
    }
  }

  let apm = null
  if (apmIntegration && elasticApm && elasticApm.isStarted && elasticApm.isStarted()) {
    apm = elasticApm
  }

  // istanbul ignore else
  if (apm) {
    // Set "service.name" and "event.dataset" from APM conf, if not already set.
    let serviceName = (ecsFields.service && ecsFields.service.name && typeof ecsFields.service.name === 'string'
      ? ecsFields.service.name
      : undefined)
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
        if (ecsFields.service === undefined) {
          ecsFields.service = { name: serviceName }
        } else if (!isVanillaObject(ecsFields.service)) {
          // Warning: "service" type conflicts with ECS spec. Overwriting.
          ecsFields.service = { name: serviceName }
        } else {
          ecsFields.service.name = serviceName
        }
      }
    }
    if (serviceName &&
        !(ecsFields.event && ecsFields.event.dataset &&
          typeof ecsFields.event.dataset === 'string')) {
      if (ecsFields.event === undefined) {
        ecsFields.event = { dataset: serviceName + '.log' }
      } else if (!isVanillaObject(ecsFields.event)) {
        // Warning: "event" type conflicts with ECS spec. Overwriting.
        ecsFields.event = { dataset: serviceName + '.log' }
      } else {
        ecsFields.event.dataset = serviceName + '.log'
      }
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

  // https://www.elastic.co/guide/en/ecs/current/ecs-error.html
  if (info.err !== undefined) {
    if (convertErr) {
      formatError(ecsFields, info.err)
    } else {
      ecsFields.err = info.err
    }
  }

  // https://www.elastic.co/guide/en/ecs/current/ecs-http.html
  if (info.req !== undefined) {
    if (convertReqRes) {
      formatHttpRequest(ecsFields, info.req)
    } else {
      ecsFields.req = info.req
    }
  }
  if (info.res !== undefined) {
    if (convertReqRes) {
      formatHttpResponse(ecsFields, info.res)
    } else {
      ecsFields.res = info.res
    }
  }

  info[MESSAGE] = stringify(ecsFields)
  return info
}

// Return true if the given arg is a "vanilla" object. Roughly the intent is
// whether this is basic mapping of string keys to values that will serialize
// as a JSON object.
//
// Currently, it excludes Map. The uses above don't really expect a user to:
//     service = new Map([["foo", "bar"]])
//     log.info({ service }, '...')
//
// There are many ways tackle this. See some attempts and benchmarks at:
// https://gist.github.com/trentm/34131a92eede80fd2109f8febaa56f5a
function isVanillaObject (o) {
  return (typeof o === 'object' &&
    (!o.constructor || o.constructor.name === 'Object'))
}

module.exports = format(ecsTransform)
