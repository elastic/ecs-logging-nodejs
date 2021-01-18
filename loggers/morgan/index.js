// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const morgan = require('morgan')
const {
  version,
  stringify,
  formatHttpRequest,
  formatHttpResponse
} = require('@elastic/ecs-helpers')

function ecsFormat (format = morgan.combined) {
  // `format` is a format *name* (e.g. 'combined'), format function (e.g.
  // `morgan.combined`), or a format string (e.g. ':method :url :status')
  // Resolve this to a format function a la morgan's own `getFormatFunction`.
  let fmt = morgan[format] || format
  if (typeof fmt !== 'function') {
    fmt = morgan.compile(fmt)
  }

  return function formatter (token, req, res) {
    var ecs = {
      '@timestamp': new Date().toISOString(),
      'log.level': res.statusCode < 500 ? 'info' : 'error',
      message: fmt(token, req, res),
      ecs: { version }
    }

    formatHttpRequest(ecs, req)
    formatHttpResponse(ecs, res)

    return stringify(ecs)
  }
}

module.exports = ecsFormat
