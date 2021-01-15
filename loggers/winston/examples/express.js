// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

// This shows how one could use @elastic/ecs-winston-format with Express.
// This implements simple Express middleware to do so.

const ecsFormat = require('../') // @elastic/ecs-winston-format
var express = require('express')
var winston = require('winston')

// Simple express middleware for request logging.
function expressRequestLogger (opts) {
  const logger = opts.logger

  return function (req, res, next) {
    // Shim 'res.end' to be able to log after that is done. We rely on it
    // only being called once.
    const origResEnd = res.end
    res.end = function shimmedResEnd (chunk, encoding) {
      res.end = origResEnd
      res.end(chunk, encoding)

      logger.info(`${req.method} ${req.path}`, { req, res })
    }

    next()
  }
}

// Simple express middleware for error logging.
function expressErrorLogger (opts) {
  const logger = opts.logger

  return function (err, req, res, next) {
    // TODO: error formatting `convertErr`
    logger.info(`error handling ${req.method} ${req.path}`, { err })
    next(err)
  }
}

var logger = winston.createLogger({
  format: ecsFormat({ convertReqRes: true }), // be sure to set convertReqRes
  transports: [
    new winston.transports.Console()
  ]
})

var app = express()

// Attach request logger middleware *early*.
app.use(expressRequestLogger({ logger }))

app.get('/', function (req, res, next) {
  res.setHeader('Foo', 'Bar')
  res.write('hi')
  res.end()
})
app.get('/error', function (req, res, next) {
  return next(new Error('boom'))
})

// Express error loggers should be the last middleware added.
app.use(expressErrorLogger({ logger }))

app.listen(3000, function () {
  logger.info(`listening at http://localhost:${this.address().port}`)
})
