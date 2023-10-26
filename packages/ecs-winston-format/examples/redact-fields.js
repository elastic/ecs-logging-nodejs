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

const http = require('http')
const fastRedact = require('fast-redact')
const winston = require('winston')
const { ecsFields, ecsStringify } = require('../') // @elastic/ecs-winston-format

// A formatter for Winston loggers to redact (obscure or remove) log record
// fields.
//
// Usage:
//   const log = winston.createLogger({
//     format: winston.format.combine(
//       // ...
//       new WinstonRedactFormatter(<options>),
//       // Some finalizing formatter, for example:
//       //     winston.format.json()
//     ),
//     // ...
//   })
//
// For example, if your log records include HTTP request headers at
// "http.request.headers" and your services uses auth, you might want to
// redact the "Authorization" header via:
//
//       new WinstonRedactFormatter({
//         paths: ['http.request.headers.authorization']
//       })
//
// This will result in log records looking like:
//
//       "request": {
//         "method": "GET",
//         "headers": {
//           "authorization": "[REDACTED]",
//
// Options:
// - opts.paths: An array of strings describe the location of keys per
//   https://github.com/davidmarkclements/fast-redact#paths--array
// - opts.censor: The replacement value, by default "[REDACTED]".
//   Tip: use `censor: undefined` to have matching paths replaced with
//   `undefined` which, if you use a JSON log output format, will result in
//   matching paths being *removed*.
class WinstonRedactFormatter {
  constructor (opts) {
    const fastRedactOpts = {
      paths: opts.paths,
      // This option tells fast-redact to just do the redactions in-place.
      // Leave serialization to a separate Winston formatter.
      serialize: false
    }
    if ('censor' in opts) {
      fastRedactOpts.censor = opts.censor
    }
    this.redact = fastRedact(fastRedactOpts)
  }

  transform (info) {
    this.redact(info)
    return info
  }
}

const log = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    ecsFields({ convertReqRes: true }),
    new WinstonRedactFormatter({
      paths: ['passwd', 'http.request.headers.authorization'],
      // censor: '🙈'
    }),
    // Get *similar* results with winston.format.json().
    ecsStringify()
  ),
  transports: [
    new winston.transports.Console()
  ]
})

const server = http.createServer(function handler (req, res) {
  const body = JSON.stringify({ ping: 'pong' })
  res.write(body)
  res.end()
  log.info('handled request', { req, res, passwd: 'sekrit' })
})

server.listen(3000, function () {
  log.info('listening')
  http.get('http://localhost:3000/', {
    headers: {
      Authorization: 'Bearer fuzzywuzzy'
    }
  }, function (res) {
    const chunks = []
    res.setEncoding('utf8')
    res.on('data', function (c) {
      chunks.push(c)
    })
    res.on('end', function () {
      const body = chunks.join('')
      log.info(`got ${res.statusCode} response`,
        { headers: res.headers, body: body })
      server.close()
    })
  })
})
