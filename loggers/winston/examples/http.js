// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const http = require('http')
const winston = require('winston')
const ecsFormat = require('../') // @elastic/ecs-winston-format

const logger = winston.createLogger({
  level: 'info',
  format: ecsFormat({ convertReqRes: true }),  // <-- use convertReqRes option
  transports: [
    new winston.transports.Console()
  ]
})

const server = http.createServer(handler)
server.listen(3000, () => {
  logger.info('listening at http://localhost:3000')
})

function handler (req, res) {
  res.setHeader('Foo', 'Bar')
  res.end('ok')
  logger.info('handled request', { req, res })  // <-- pass in `req` and/or `res`
}
