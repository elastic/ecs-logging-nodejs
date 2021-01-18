// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

// This shows how one could use @elastic/ecs-pino-format with Express and
// the https://github.com/pinojs/pino-http middleware maintained by the Pino
// team.
// TODO: doc the log.child({req}) limitation
// TODO: doc pino-http's 'req.id' and ECS translation to 'event.id'

const ecsFormat = require('../') // @elastic/ecs-pino-format
const express = require('express')
const pino = require('pino')
const pinoHttp = require('pino-http')

const log = pino({ ...ecsFormat({ convertReqRes: true }) })
const app = express()
app.set('env', 'test') // turns off Express's default console.error of errors

app.use(pinoHttp({ logger: log }))

app.get('/', function (req, res, next) {
  res.setHeader('Foo', 'Bar')
  res.end('hi')
  res.log.info({ req, res }, 'hi there')
})
app.get('/error', function (req, res, next) {
  return next(new Error('boom'))
})

app.listen(3000, function () {
  log.info(`listening at http://localhost:${this.address().port}`)
})
