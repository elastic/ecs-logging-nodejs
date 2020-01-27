'use strict'

const { MESSAGE } = require('triple-beam')
const { format } = require('winston')
const stringify = require('./serializer')

const reservedKeys = [
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
    log: {
      level: log.level,
      logger: 'winston'
    },
    ecs: {
      version: '1.4.0'
    },
    '@timestamp': new Date().toISOString(),
    message: log.message
  }

  if (log.req || log.request) {
    ecsFormatHttpRequest(ecs, log.req || log.request)
  }

  if (log.res || log.response) {
    ecsFormatHttpResponse(ecs, log.res || log.response)
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

function ecsFormatHttpRequest (ecs, req) {
  const {
    id,
    method,
    url,
    remoteAddress,
    remotePort,
    headers,
    hostname,
    httpVersion
  } = req

  if (id) {
    ecs.event = ecs.event || {}
    ecs.event.id = id
  }

  ecs.http = ecs.http || {}
  ecs.http.version = httpVersion
  ecs.http.request = ecs.http.request || {}
  ecs.http.request.method = method.toLowerCase()

  ecs.url = ecs.url || {}
  ecs.url.full = url
  var hasQuery = url.indexOf('?')
  var hasAnchor = url.indexOf('#')
  if (hasQuery > -1 && hasAnchor > -1) {
    ecs.url.path = url.slice(0, hasQuery)
    ecs.url.query = url.slice(hasQuery + 1, hasAnchor)
    ecs.url.fragment = url.slice(hasAnchor + 1)
  } else if (hasQuery > -1) {
    ecs.url.path = url.slice(0, hasQuery)
    ecs.url.query = url.slice(hasQuery + 1)
  } else if (hasAnchor > -1) {
    ecs.url.path = url.slice(0, hasAnchor)
    ecs.url.fragment = url.slice(hasAnchor + 1)
  } else {
    ecs.url.path = url
  }

  if (hostname) {
    const [host, port] = hostname.split(':')
    ecs.url.domain = host
    if (port) ecs.url.port = Number(port)
  }

  if (remoteAddress || remotePort) {
    ecs.client = ecs.client || {}
    ecs.client.address = remoteAddress
    ecs.client.port = remotePort
  }

  if (headers) {
    if (headers['user-agent']) {
      ecs.user_agent = ecs.user_agent || {}
      ecs.user_agent.original = headers['user-agent']
      delete headers['user-agent']
    }
    if (headers['content-length']) {
      ecs.http.request.body = ecs.http.request.body || {}
      ecs.http.request.body.bytes = Number(headers['content-length'])
      delete headers['content-length']
    }

    if (Object.keys(headers).length) {
      // `http.request.headers` is not standardized
      ecs.http.request.headers = headers
    }
  }
}

function ecsFormatHttpResponse (ecs, res) {
  const { statusCode, headers } = res
  ecs.http = ecs.http || {}
  ecs.http.response = ecs.http.response || {}
  ecs.http.response.status_code = statusCode

  if (headers) {
    if (headers['content-length']) {
      ecs.http.response.body = ecs.http.response.body || {}
      ecs.http.response.body.bytes = Number(headers['content-length'])
      delete headers['content-length']
    }

    if (Object.keys(headers).length) {
      // `http.response.headers` is not standardized
      ecs.http.response.headers = headers
    }
  }
}

module.exports = format(ecsFormat)
