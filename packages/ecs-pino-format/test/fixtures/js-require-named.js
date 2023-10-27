// The new way to import @elastic/ecs-pino-format.
const { ecsFormat } = require('../../')
const pino = require('pino')
const log = pino(ecsFormat())
log.info('hi')
