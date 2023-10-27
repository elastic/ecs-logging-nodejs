import { ecsFormat } from '../../index.js'
import pino from 'pino'
const log = pino(ecsFormat())
log.info('hi')
