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

const reservedKeys = [
  'level',
  'log',
  'ecs',
  '@timestamp',
  'message',
  'req',
  'res'
]

// https://github.com/winstonjs/winston#creating-custom-formats
function ecsTransform (info, opts) {
  var ecsFields = {
    '@timestamp': new Date().toISOString(),
    'log.level': info.level,
    message: info.message,
    ecs: { version }
  }

  if (opts.convertReqRes) {
    if (info.req) {
      formatHttpRequest(ecsFields, info.req)
    }
    if (info.res) {
      formatHttpResponse(ecsFields, info.res)
    }
  }

  var keys = Object.keys(info)
  for (var i = 0, len = keys.length; i < len; i++) {
    var key = keys[i]
    if (reservedKeys.indexOf(key) === -1) {
      ecsFields[key] = info[key]
    }
  }

  info[MESSAGE] = stringify(ecsFields)
  return info
}

module.exports = format(ecsTransform)
