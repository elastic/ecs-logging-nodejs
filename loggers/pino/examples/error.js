const ecsFormat = require('..') // @elastic/ecs-pino-format
const pino = require('pino')
const log = pino({ ...ecsFormat() })

const myErr = new Error('boom')
log.info({ err: myErr }, 'oops')
