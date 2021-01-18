// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const app = require('express')()
const morgan = require('morgan')
const ecsFormat = require('../') // @elastic/ecs-winston-format

app.use(morgan(ecsFormat()))

app.get('/', function (req, res) {
  res.send('hello, world!')
})
app.get('/error', function (req, res, next) {
  next(new Error('boom'))
})

app.listen(3000)
