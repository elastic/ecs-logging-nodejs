// Licensed to Elasticsearch B.V. under one or more contributor
// license agreements. See the NOTICE file distributed with
// this work for additional information regarding copyright
// ownership. Elasticsearch B.V. licenses this file to you under
// the Apache License, Version 2.0 (the "License"); you may
// not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

'use strict'

// This shows how one could use @elastic/ecs-pino-format with Express and
// the https://github.com/pinojs/pino-http middleware maintained by the Pino
// team.
// TODO: doc the log.child({req}) limitation. See https://github.com/elastic/ecs-logging-nodejs/issues/102 and https://gist.github.com/gkampitakis/b36819f38f8886598c20ed1af7245e3a
// TODO: doc pino-http's 'req.id' and ECS translation to 'event.id'

const { ecsFormat } = require('../') // @elastic/ecs-pino-format
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
  req.log.info('in app.get / handler')
})
app.get('/error', function (req, res, next) {
  return next(new Error('boom'))
})

app.listen(3000, function () {
  log.info(`listening at http://localhost:${this.address().port}`)
})
