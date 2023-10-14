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

// This example shows how @elastic/ecs-pino-format logging will integrate
// with Elastic APM (https://www.elastic.co/apm).
//
// If usage of Elastic APM is detected (i.e. the "elastic-apm-node" package
// is being used), then log records will include trace identifiers, e.g.:
//       "trace.id": "678f2a0189f259baf2ea17db8af5a4d0",
//       "transaction.id": "1cc6339964575165",
//       "span.id": "f72c52ceda81777a",
// to correlate log and trace data in Kibana.

/* eslint-disable-next-line no-unused-vars */
const apm = require('elastic-apm-node').start({
  serviceName: 'http-with-elastic-apm',
  centralConfig: false,
  captureExceptions: false,
  metricsInterval: '0s',
  logLevel: 'warn' // avoid APM agent log preamble
})

const http = require('http')
const https = require('https')
const ecsFormat = require('../') // @elastic/ecs-pino-format
const pino = require('pino')

const log = pino({ ...ecsFormat({ convertReqRes: true }) })

// To create a more interesting span in our trace, we will call an external
// service: using the Pokeapi to gather Charizard's (#6) abilities.
function getCharizardAbilities (cb) {
  const req = https.request('https://pokeapi.co/api/v2/pokemon/6', function (res) {
    const chunks = []
    res.on('data', function (chunk) { chunks.push(chunk) })
    res.on('end', function () {
      if (res.statusCode !== 200) {
        cb(new Error(`unexpected response: ${res.statusCode}`))
        return
      }

      let data
      try {
        data = JSON.parse(chunks.join(''))
      } catch (parseErr) {
        cb(parseErr)
        return
      }
      cb(null, data.abilities.map(a => a.ability.name))
    })
  })
  req.end()
}

const server = http.createServer(function handler (req, res) {
  getCharizardAbilities(function (err, abilities) {
    if (err) {
      res.writeHead(500)
      res.end(`error getting charizard abilities: ${err}`)
      log.error({ err, req, res }, 'could not get charizard abilities')
      return
    }

    res.setHeader('X-Charizard-Abilities', abilities.join(', '))
    res.end('ok')
    log.info({ req, res }, 'handled request')
  })
})

server.listen(3000, () => {
  log.info('listening at http://localhost:3000')
})
