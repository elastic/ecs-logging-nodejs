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
const safeStableStringify = require('safe-stable-stringify')
const {
  version,
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

// There are some differences between Winston's `logform.format.json()` and this
// stringifier. They both use `safe-stable-stringify`. Winston's exposes its
// options but doesn't doc that at https://github.com/winstonjs/logform#json.
// 1. This one hardcodes `deterministic: false` so fields are serialized in the
//    order added, which is helpful for ecs-logging's stated preference of
//    having a few fields first:
//    https://www.elastic.co/guide/en/ecs-logging/overview/current/intro.html#_why_ecs_logging
// 2. Winston provides a `replacer` that converts bigints to strings. Doing
//    that is debatable. The argument *for* is that a *JavaScript* JSON parser
//    looses precision when parsing a bigint.
// TODO: These differences should make it to docs somewhere.
const stringify = safeStableStringify.configure({ deterministic: false })

const reservedFields = {
  level: true,
  'log.level': true,
  ecs: true,
  '@timestamp': true,
  err: true,
  req: true,
  res: true
}

/**
 * A Winston `Format` for converting to ecs-logging output.
 *
 * @class {import('logform').Format}
 * @param {Config} opts - See index.d.ts.
 */
class EcsWinstonTransform {
  constructor (opts) {
    this.options = opts
  }

  transform (info, opts) {
    // istanbul ignore next
    opts = opts || {}
    const convertErr = opts.convertErr != null ? opts.convertErr : true
    const convertReqRes = opts.convertReqRes != null ? opts.convertReqRes : false
    const apmIntegration = opts.apmIntegration != null ? opts.apmIntegration : true

    const ecsFields = {
      '@timestamp': new Date().toISOString(),
      'log.level': info.level,
      message: info.message,
      'ecs.version': version
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

    // Set a number of correlation fields from (a) the given options or (b) an
    // APM agent, if there is one running.
    let serviceName = opts.serviceName
    if (serviceName == null && apm) {
      // istanbul ignore next
      serviceName = (apm.getServiceName
        ? apm.getServiceName() // added in elastic-apm-node@3.11.0
        : apm._conf.serviceName) // fallback to private `_conf`
    }
    if (serviceName) {
      ecsFields['service.name'] = serviceName
    }

    let serviceVersion = opts.serviceVersion
    if (serviceVersion == null && apm) {
      // istanbul ignore next
      serviceVersion = (apm.getServiceVersion
        ? apm.getServiceVersion() // added in elastic-apm-node@...
        : apm._conf.serviceVersion) // fallback to private `_conf`
    }
    if (serviceVersion) {
      ecsFields['service.version'] = serviceVersion
    }

    let serviceEnvironment = opts.serviceEnvironment
    if (serviceEnvironment == null && apm) {
      // istanbul ignore next
      serviceEnvironment = (apm.getServiceEnvironment
        ? apm.getServiceEnvironment() // added in elastic-apm-node@...
        : apm._conf.environment) // fallback to private `_conf`
    }
    if (serviceEnvironment) {
      ecsFields['service.environment'] = serviceEnvironment
    }

    let serviceNodeName = opts.serviceNodeName
    if (serviceNodeName == null && apm) {
      // istanbul ignore next
      serviceNodeName = (apm.getServiceNodeName
        ? apm.getServiceNodeName() // added in elastic-apm-node@...
        : apm._conf.serviceNodeName) // fallback to private `_conf`
    }
    if (serviceNodeName) {
      ecsFields['service.node.name'] = serviceNodeName
    }

    let eventDataset = opts.eventDataset
    if (eventDataset == null && serviceName) {
      eventDataset = serviceName
    }
    if (eventDataset) {
      ecsFields['event.dataset'] = eventDataset
    }

    // istanbul ignore else
    if (apm) {
      // https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html
      const tx = apm.currentTransaction
      if (tx) {
        ecsFields['trace.id'] = tx.traceId
        ecsFields['transaction.id'] = tx.id
        const span = apm.currentSpan
        // istanbul ignore else
        if (span) {
          ecsFields['span.id'] = span.id
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
}

module.exports = opts => new EcsWinstonTransform(opts)
