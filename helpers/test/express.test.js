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

const http = require('http')

const express = require('express')
const test = require('tap').test

const {
  formatHttpRequest,
  formatHttpResponse
} = require('../')

test('express res/req serialization', t => {
  const app = express()
  let server

  app.get('/', (req, res) => {
    const rec = {}

    res.setHeader('Foo', 'Bar')
    res.write('hi')
    res.end()

    formatHttpRequest(rec, req)
    formatHttpResponse(rec, res)

    t.deepEqual(rec.user_agent, { original: 'cool-agent' })
    t.deepEqual(rec.url, {
      path: '/',
      full: `http://localhost:${server.address().port}/`,
      domain: 'localhost'
    })
    t.deepEqual(rec.http, {
      version: '1.1',
      request: {
        method: 'get',
        headers: {
          host: `localhost:${server.address().port}`,
          connection: 'close'
        }
      },
      response: {
        status_code: 200,
        headers: {
          'x-powered-by': 'Express',
          foo: 'Bar'
        }
      }
    })
    // https://www.elastic.co/guide/en/ecs/current/ecs-client.html fields
    t.ok(rec.client, 'client fields are set')
    t.ok(rec.client.address === '127.0.0.1' || rec.client.address === '::ffff:127.0.0.1',
      'client.address is set')
    t.ok(rec.client.ip === rec.client.address,
      'client.address duplicated to client.ip')
    t.equal(typeof (rec.client.port), 'number')
  })

  app.listen(0, function () {
    server = this
    const req = http.get(
      `http://localhost:${server.address().port}/`,
      {
        headers: { 'user-agent': 'cool-agent' }
      },
      function (res) {
        res.on('data', function () {})
        res.on('end', function () {
          server.close(function () {
            t.end()
          })
        })
      }
    )
    req.on('error', t.ifErr)
  })
})
