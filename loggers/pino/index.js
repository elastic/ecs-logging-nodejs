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

const {
  version,
  formatError,
  formatHttpRequest,
  formatHttpResponse
} = require('@elastic/ecs-helpers')

const { hasOwnProperty } = Object.prototype
let elasticApm = null
try {
  elasticApm = require('elastic-apm-node')
} catch (ex) {
  // Silently ignore.
}

function createEcsPinoOptions (opts) {
  // Boolean options for whether to specially handle some logged field names:
  //  - `err` to ECS Error fields
  //  - `req` and `res` to ECS HTTP, User agent, etc. fields
  // These intentionally match the common serializers
  // (https://getpino.io/#/docs/api?id=serializers-object). If enabled,
  // this ECS conversion will take precedence over a serializer for the same
  // field name.
  let convertErr = true
  let convertReqRes = false
  if (opts) {
    if (hasOwnProperty.call(opts, 'convertErr')) {
      convertErr = opts.convertErr
    }
    if (hasOwnProperty.call(opts, 'convertReqRes')) {
      convertReqRes = opts.convertReqRes
    }
  }

  // If there is a *started* APM agent, then use it.
  const apm = elasticApm && elasticApm.isStarted && elasticApm.isStarted() ? elasticApm : null

  const ecsPinoOptions = {
    formatters: {
      level (label, number) {
        return { 'log.level': label }
      },

      // Add the following ECS fields:
      // - https://www.elastic.co/guide/en/ecs/current/ecs-process.html#field-process-pid
      // - https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-hostname
      // - https://www.elastic.co/guide/en/ecs/current/ecs-log.html#field-log-logger
      //
      // This is called once at logger creation, and for each child logger creation.
      bindings (bindings) {
        const {
          // We assume the default `pid` and `hostname` bindings
          // (https://getpino.io/#/docs/api?id=bindings) will be always be
          // defined because currently one cannot use this package *and*
          // pass a custom `formatters` to a pino logger.
          pid,
          hostname,
          // name is defined if `log = pino({name: 'my name', ...})`
          name
        } = bindings

        const ecsBindings = {
          ecs: {
            version
          },
          process: {
            pid: pid
          },
          host: {
            hostname: hostname
          }
        }
        if (name !== undefined) {
          ecsBindings.log = { logger: name }
        }

        if (apm) {
          // https://github.com/elastic/apm-agent-nodejs/pull/1949 is adding
          // getServiceName() in v3.11.0. Fallback to private `apm._conf`.
          // istanbul ignore next
          const serviceName = apm.getServiceName
            ? apm.getServiceName()
            : apm._conf.serviceName
          // A mis-configured APM Agent can be "started" but not have a
          // "serviceName".
          if (serviceName) {
            ecsBindings.service = { name: serviceName }
            ecsBindings.event = { dataset: serviceName + '.log' }
          }
        }

        return ecsBindings
      }
    },
    messageKey: 'message',
    timestamp: () => `,"@timestamp":"${new Date().toISOString()}"`
  }

  // For performance, avoid adding the `formatters.log` pino option unless we
  // know we'll do some processing in it.
  if (convertErr || convertReqRes || apm) {
    ecsPinoOptions.formatters.log = function (obj) {
      const {
        req,
        res,
        err,
        ...ecsObj
      } = obj

      // istanbul ignore else
      if (apm) {
        // https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html
        const tx = apm.currentTransaction
        if (tx) {
          ecsObj.trace = ecsObj.trace || {}
          ecsObj.trace.id = tx.traceId
          ecsObj.transaction = ecsObj.transaction || {}
          ecsObj.transaction.id = tx.id
          const span = apm.currentSpan
          // istanbul ignore else
          if (span) {
            ecsObj.span = ecsObj.span || {}
            ecsObj.span.id = span.id
          }
        }
      }

      // https://www.elastic.co/guide/en/ecs/current/ecs-http.html
      if (err !== undefined) {
        if (!convertErr) {
          ecsObj.err = err
        } else {
          formatError(ecsObj, err)
        }
      }

      // https://www.elastic.co/guide/en/ecs/current/ecs-http.html
      if (req !== undefined) {
        if (!convertReqRes) {
          ecsObj.req = req
        } else {
          formatHttpRequest(ecsObj, req)
        }
      }
      if (res !== undefined) {
        if (!convertReqRes) {
          ecsObj.res = res
        } else {
          formatHttpResponse(ecsObj, res)
        }
      }

      return ecsObj
    }
  }

  return ecsPinoOptions
}

module.exports = createEcsPinoOptions
