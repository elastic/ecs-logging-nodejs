// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const morgan = require('morgan')
const {
  stringify,
  formatHttpRequest,
  formatHttpResponse
} = require('../../helper')

function ecsFormat (format = morgan.combined) {
  const messageFormat = morgan.compile(format)
  return formatter

  function formatter (token, req, res) {
    var ecs = {
      '@timestamp': new Date().toISOString(),
      log: {
        level: res.statusCode < 500 ? 'info' : 'error',
        logger: 'morgan'
      },
      message: messageFormat(token, req, res),
      ecs: {
        version: '1.4.0'
      }
    }

    formatHttpRequest(ecs, req)
    formatHttpResponse(ecs, res)

    return stringify(ecs)
  }
}

module.exports = ecsFormat
