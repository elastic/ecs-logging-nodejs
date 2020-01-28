// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

function formatHttpRequest (ecs, req) {
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

function formatHttpResponse (ecs, res) {
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

module.exports = { formatHttpRequest, formatHttpResponse }
