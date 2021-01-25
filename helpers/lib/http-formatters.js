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
    httpVersion,
    socket
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
  ecs.url.full = (socket.encrypted ? 'https://' : 'http://') + headers.host + url
  const hasQuery = url.indexOf('?')
  const hasAnchor = url.indexOf('#')
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
    if (port) {
      ecs.url.port = Number(port)
    }
  }

  if (remoteAddress || remotePort) {
    ecs.client = ecs.client || {}
    ecs.client.address = remoteAddress
    ecs.client.port = remotePort
  }

  const hasHeaders = Object.keys(headers).length > 0
  if (hasHeaders === true) {
    ecs.http.request.headers = ecs.http.request.headers || {}
    for (const header in headers) {
      if (header === 'content-length') {
        ecs.http.request.body = ecs.http.request.body || {}
        ecs.http.request.body.bytes = Number(headers[header])
      } else if (header === 'user-agent') {
        ecs.user_agent = ecs.user_agent || {}
        ecs.user_agent.original = headers[header]
      } else {
        // `http.response.headers` is not standardized
        ecs.http.request.headers[header] = headers[header]
      }
    }
  }
}

function formatHttpResponse (ecs, res) {
  const { statusCode } = res
  ecs.http = ecs.http || {}
  ecs.http.response = ecs.http.response || {}
  ecs.http.response.status_code = statusCode

  const headers = res.getHeaders()
  const hasHeaders = Object.keys(headers).length > 0
  if (hasHeaders === true) {
    ecs.http.response.headers = ecs.http.response.headers || {}
    for (const header in headers) {
      if (header === 'content-length') {
        ecs.http.response.body = ecs.http.response.body || {}
        ecs.http.response.body.bytes = Number(headers[header])
      } else {
        // `http.response.headers` is not standardized
        ecs.http.response.headers[header] = headers[header]
      }
    }
  }
}

module.exports = { formatHttpRequest, formatHttpResponse }
