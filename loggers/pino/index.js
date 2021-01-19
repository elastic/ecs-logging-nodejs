// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

// We will query the Elastic APM agent if it is available.
let elasticApm = null
try {
  elasticApm = require('elastic-apm-node')
} catch (ex) {
  // Silently ignore.
}

const {
  version,
  formatHttpRequest,
  formatHttpResponse
} = require('@elastic/ecs-helpers')

function createEcsPinoOptions (opts) {
  // Boolean options for whether to handle converting `req` and `res`
  // fields to ECS fields. These intentionally match the common serializers
  // (https://getpino.io/#/docs/api?id=serializers-object). If enabled,
  // this ECS conversion will take precedence over a serializer for the same
  // field name.
  let convertReqRes = false
  if (opts) {
    if (Object.prototype.hasOwnProperty.call(opts, 'convertReqRes')) {
      convertReqRes = opts.convertReqRes
    }
  }

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

        return ecsBindings
      }
    },
    messageKey: 'message',
    timestamp: () => `,"@timestamp":"${new Date().toISOString()}"`
  }

  // For performance, avoid adding the `formatters.log` pino option unless we
  // know we'll do some processing in it.
  // istanbul ignore else
  if (convertReqRes || elasticApm) {
    ecsPinoOptions.formatters.log = function (obj) {
      const {
        req,
        res,
        ...ecsObj
      } = obj

      // https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html
      // istanbul ignore else
      if (elasticApm) {
        const tx = elasticApm.currentTransaction
        if (tx) {
          ecsObj.trace = ecsObj.trace || {}
          ecsObj.trace.id = tx.traceId
          ecsObj.transaction = ecsObj.transaction || {}
          ecsObj.transaction.id = tx.id
          const span = elasticApm.currentSpan
          // istanbul ignore else
          if (span) {
            ecsObj.span = ecsObj.span || {}
            ecsObj.span.id = span.id
          }
        }
      }

      // https://www.elastic.co/guide/en/ecs/current/ecs-http.html
      if (req) {
        if (!convertReqRes) {
          ecsObj.req = req
        } else {
          formatHttpRequest(ecsObj, req)
        }
      }
      if (res) {
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
