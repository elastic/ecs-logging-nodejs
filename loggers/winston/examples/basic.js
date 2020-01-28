'use strict'

const winston = require('winston')
const ecsFormat = require('../')

const logger = winston.createLogger({
  level: 'info',
  format: ecsFormat(),
  transports: [
    new winston.transports.Console()
  ]
})

logger.info('ecs is cool!')
logger.error('ecs is cool!', { hello: 'world' })
