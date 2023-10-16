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
let triedElasticApmImport = false
let elasticApm = null

// Create options for `pino(...)` that configure it for ecs-logging output.
//
// @param {Object} opts - Optional.
//    - {Boolean} opts.convertErr - Whether to convert a logged `err` field
//      to ECS error fields. Default true, to match Pino's default of having
//      an `err` serializer.
//    - {Boolean} opts.convertReqRes - Whether to convert logged `req` and `res`
//      HTTP request and response fields to ECS HTTP, User agent, and URL
//      fields. Default false.
//    - {Boolean} opts.apmIntegration - Whether to automatically integrate with
//      Elastic APM (https://github.com/elastic/apm-agent-nodejs). If a started
//      APM agent is detected, then log records will include the following
//      fields:
//        - "service.name" - the configured serviceName in the agent
//        - "event.dataset" - set to "$serviceName" for correlation in Kibana
//        - "trace.id", "transaction.id", and "span.id" - if there is a current
//          active trace when the log call is made
//      Default true.
function createEcsPinoOptions (opts) {
  let convertErr = true
  let convertReqRes = false
  let apmIntegration = true
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

  let apm = null
  let apmServiceName = null
  if (apmIntegration) {
    // istanbul ignore if
    if (opts && opts._elasticApm) {
      // `opts._elasticApm` is an internal/testing-only option to be used
      // for testing in the APM agent where the import is a local path
      // rather than "elastic-apm-node".
      elasticApm = opts._elasticApm
    } else if (!triedElasticApmImport) {
      triedElasticApmImport = true
      // We lazily require this module here instead of at the top-level to
      // avoid a possible circular-require if the user code does
      // `require('@elastic/ecs-pino-format')` and has a "node_modules/"
      // where 'elastic-apm-node' shares the same ecs-pino-format install.
      try {
        elasticApm = require('elastic-apm-node')
      } catch (ex) {
        // Silently ignore.
      }
    }
    if (elasticApm && elasticApm.isStarted && elasticApm.isStarted()) {
      apm = elasticApm
      // istanbul ignore next
      apmServiceName = apm.getServiceName
        ? apm.getServiceName() // added in elastic-apm-node@3.11.0
        : apm._conf.serviceName
    }
  }

  let wasBindingsCalled = false
  function addStaticEcsBindings (obj) {
    obj['ecs.version'] = version
    if (apmServiceName) {
      obj['service.name'] = apmServiceName
      obj['event.dataset'] = apmServiceName
    }
  }

  const ecsPinoOptions = {
    messageKey: 'message',
    timestamp: () => `,"@timestamp":"${new Date().toISOString()}"`,
    formatters: {
      level (label, number) {
        return { 'log.level': label }
      },

      bindings (bindings) {
        const {
          // `pid` and `hostname` are default bindings, unless overriden by
          // a `base: {...}` passed to logger creation.
          pid,
          hostname,
          // name is defined if `log = pino({name: 'my name', ...})`
          name,
          ...ecsBindings
        } = bindings

        if (pid !== undefined) {
          // https://www.elastic.co/guide/en/ecs/current/ecs-process.html#field-process-pid
          ecsBindings['process.pid'] = pid
        }
        if (hostname !== undefined) {
          // https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-hostname
          ecsBindings['host.hostname'] = hostname
        }
        if (name !== undefined) {
          // https://www.elastic.co/guide/en/ecs/current/ecs-log.html#field-log-logger
          ecsBindings['log.logger'] = name
        }

        // With `pino({base: null, ...})` the `formatters.bindings` is *not*
        // called. In this case we need to make sure to add our static bindings
        // in `log()` below.
        wasBindingsCalled = true
        addStaticEcsBindings(ecsBindings)

        return ecsBindings
      },

      log (obj) {
        const {
          req,
          res,
          err,
          ...ecsObj
        } = obj

        if (!wasBindingsCalled) {
          addStaticEcsBindings(ecsObj)
        }

        if (apm) {
          // https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html
          const tx = apm.currentTransaction
          if (tx) {
            ecsObj['trace.id'] = tx.traceId
            ecsObj['transaction.id'] = tx.id
            const span = apm.currentSpan
            // istanbul ignore else
            if (span) {
              ecsObj['span.id'] = span.id
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
  }

  return ecsPinoOptions
}

module.exports = createEcsPinoOptions
