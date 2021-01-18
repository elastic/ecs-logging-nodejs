// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const http = require('http')
const ecsFormat = require('../') // @elastic/ecs-pino-format
const pino = require('pino')

const log = pino({ ...ecsFormat() })

const server = http.createServer(function handler (req, res) {
  res.setHeader('Foo', 'Bar')
  res.end('ok')
  log.info({ req, res }, 'handled request')
})

server.listen(3000, () => {
  log.info('listening at http://localhost:3000')
})
