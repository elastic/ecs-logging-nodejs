// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const http = require('http')
const winston = require('winston')
const ecsFormat = require('../') // @elastic/ecs-winston-format

const logger = winston.createLogger({
  level: 'info',
  format: ecsFormat({ convertReqRes: true }),
  transports: [
    new winston.transports.Console()
  ]
})

const server = http.createServer(function handler (req, res) {
  // Tiny, but not absolutely nothing for endpoint handling:
  res.setHeader('Server', 'server-pong.js')
  res.end(JSON.stringify({ ping: 'pong' }))

  logger.info('handled request', { req, res })
})

server.listen(3000)
