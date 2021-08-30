import ecsFormat from '../../../'
import pino = require('pino')
const log = pino(ecsFormat())
log.info('hi')
