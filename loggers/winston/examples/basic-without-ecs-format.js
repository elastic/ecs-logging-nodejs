// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

// This shows a basic Winston logging config *without ECS logging formatting*
// for comparison with "basic.js". E.g. compare with `diff -u basic*.js`.

const winston = require('winston')

const logger = winston.createLogger({
  level: 'info',
  // Using @elastic/ecs-winston-format compares most closely with this
  // winston format:
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
})

logger.info('hi')
logger.error('oops there is a problem', { foo: 'bar' })
