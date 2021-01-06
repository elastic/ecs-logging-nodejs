// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const {
  version,
  formatHttpRequest,
  formatHttpResponse
} = require('@elastic/ecs-helpers')

function build () {
  return {
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
      },

      log (obj) {
        const {
          req,
          request,
          res,
          response,
          ...ecs
        } = obj

        ecs.ecs = { version }

        if (req || request) {
          formatHttpRequest(ecs, req || request)
        }

        if (res || response) {
          formatHttpResponse(ecs, res || response)
        }

        return ecs
      }
    },
    messageKey: 'message',
    timestamp: () => `,"@timestamp":"${new Date().toISOString()}"`
  }
}

module.exports = build
