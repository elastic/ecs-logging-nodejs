// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const http = require('http')
const ecsFormat = require('../')()
const pino = require('pino')({ ...ecsFormat })

const server = http.createServer(handler)
server.listen(3000, () => {
  console.log('Listening')
})

function handler (req, res) {
  pino.info({ req, res }, 'incoming request')
  res.end('ok')
}
