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

// Winston format transform to mutate `info` into an object with ecs-logging
// fields.
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
function ecsFieldsTransform (info, opts) {
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

  info['@timestamp'] = new Date().toISOString()
  info['log.level'] = info.level
  // Removing 'level' might cause trouble for downstream winston formatters
  // given that https://github.com/winstonjs/logform#info-objects says:
  //
  // > Every info must have at least the level and message properties:
  //
  // However info still has a `info[Symbol.for('level')]` for more reliable use.
  delete info.level
  info.ecs = { version }

  let apm = null
  if (apmIntegration && elasticApm && elasticApm.isStarted && elasticApm.isStarted()) {
    apm = elasticApm
  }

  // istanbul ignore else
  if (apm) {
    // Set "service.name" and "event.dataset" from APM conf, if not already set.
    let serviceName = info.service && info.service.name
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
        info.service = info.service || {}
        info.service.name = serviceName
      }
    }
    if (serviceName && !(info.event && info.event.dataset)) {
      info.event = info.event || {}
      info.event.dataset = serviceName + '.log'
    }

    // https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html
    const tx = apm.currentTransaction
    if (tx) {
      info.trace = info.trace || {}
      info.trace.id = tx.traceId
      info.transaction = info.transaction || {}
      info.transaction.id = tx.id
      const span = apm.currentSpan
      // istanbul ignore else
      if (span) {
        info.span = info.span || {}
        info.span.id = span.id
      }
    }
  }

  // https://www.elastic.co/guide/en/ecs/current/ecs-error.html
  if (info.err !== undefined && convertErr && info.err instanceof Error) {
    formatError(info, info.err)
    delete info.err
  }

  // https://www.elastic.co/guide/en/ecs/current/ecs-http.html
  if (info.req !== undefined && convertReqRes) {
    formatHttpRequest(info, info.req)
    delete info.req
  }
  if (info.res !== undefined && convertReqRes) {
    formatHttpResponse(info, info.res)
    delete info.res
  }

  return info
}
const ecsFields = format(ecsFieldsTransform)

function ecsStringifyTransform (info, opts) {
  info[MESSAGE] = stringify(info)
  return info
}
const ecsStringify = format(ecsStringifyTransform)

// The combination of ecsFields and ecsStringify.
function ecsFormatTransform (info, opts) {
  info = ecsFieldsTransform(info, opts)
  info[MESSAGE] = stringify(info)
  return info
}
const ecsFormat = format(ecsFormatTransform)

// For backwards compatibility with v1.0.0, the top-level export is `ecsFormat`,
// though using the separate exports is preferred.
module.exports = ecsFormat
module.exports.ecsFormat = ecsFormat
module.exports.ecsFields = ecsFields
module.exports.ecsStringify = ecsStringify
