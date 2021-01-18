// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

// This shows how one could use @elastic/ecs-pino-format with Express.
// This implements simple Express middleware to do so.

const ecsFormat = require('../') // @elastic/ecs-pino-format
const express = require('express')
const pino = require('pino')

// Simple express middleware for request logging.
function expressRequestLogger (opts) {
  const logger = opts.logger

  return function (req, res, next) {
    function onResDone (err) {
      this.removeListener('finish', onResDone)
      this.removeListener('error', onResDone)
      logger.info({ req, res, err }, `${req.method} ${req.path}`)
    }
    res.on('finish', onResDone)
    res.on('error', onResDone)
    next()
  }
}

// Simple express middleware for error logging.
function expressErrorLogger (opts) {
  const logger = opts.logger

  return function (err, req, res, next) {
    // TODO: error formatting `convertErr`
    logger.info({ err }, `error handling ${req.method} ${req.path}`)
    next(err)
  }
}

const log = pino({ ...ecsFormat() })
const app = express()
app.set('env', 'test') // turns off Express's default console.error of errors

// Attach request logger middleware *early*.
app.use(expressRequestLogger({ logger: log }))

app.get('/', function (req, res, next) {
  res.setHeader('Foo', 'Bar')
  res.write('hi')
  res.end()
})
app.get('/error', function (req, res, next) {
  return next(new Error('boom'))
})

// Express error loggers should be the last middleware added.
app.use(expressErrorLogger({ logger: log }))

app.listen(3000, function () {
  log.info(`listening at http://localhost:${this.address().port}`)
})
