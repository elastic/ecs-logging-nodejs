import * as EcsPinoFormat from '../../../'
import pino = require('pino')
const log = pino(EcsPinoFormat.ecsFormat())
log.info('hi')
