// The old way to import @elastic/ecs-pino-format, support for backward compat.
const ecsFormat = require('../../')
const pino = require('pino')
const log = pino(ecsFormat())
log.info('hi')
