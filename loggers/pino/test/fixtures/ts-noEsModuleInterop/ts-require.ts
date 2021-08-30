const { ecsFormat } = require('../../../')
import pino = require('pino')
const log = pino(ecsFormat())
log.info('hi')
