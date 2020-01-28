// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const { MESSAGE } = require('triple-beam')
const { format } = require('winston')
const {
  stringify,
  formatHttpRequest,
  formatHttpResponse
} = require('../../helper')

const reservedKeys = [
  'level',
  'log',
  'ecs',
  '@timestamp',
  'message',
  'req',
  'request',
  'res',
  'response'
]

function ecsFormat (log) {
  var ecs = {
    '@timestamp': new Date().toISOString(),
    log: {
      level: log.level,
      logger: 'winston'
    },
    message: log.message,
    ecs: {
      version: '1.4.0'
    }
  }

  if (log.req || log.request) {
    formatHttpRequest(ecs, log.req || log.request)
  }

  if (log.res || log.response) {
    formatHttpResponse(ecs, log.res || log.response)
  }

  var keys = Object.keys(log)
  for (var i = 0, len = keys.length; i < len; i++) {
    var key = keys[i]
    if (reservedKeys.indexOf(key) === -1) {
      ecs[key] = log[key]
    }
  }

  log[MESSAGE] = stringify(ecs)
  return log
}

module.exports = format(ecsFormat)
