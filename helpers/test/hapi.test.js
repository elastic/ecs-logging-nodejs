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

const semver = require('semver')
const test = require('tap').test
const hapiNodeEngines = require('@hapi/hapi/package.json').engines.node

const {
  formatHttpRequest,
  formatHttpResponse
} = require('../')

const testOpts = {
  skip: !semver.satisfies(process.versions.node, hapiNodeEngines) &&
    `node ${process.version} is not supported by this hapi (${hapiNodeEngines})`
}

test('hapi res/req serialization', testOpts, t => {
  const Hapi = require('@hapi/hapi')
  const server = Hapi.server({ host: 'localhost' })

  server.route({
    method: 'GET',
    path: '/',
    handler: (request, h) => {
      return h.response('hi')
        .header('Foo', 'Bar')
    }
  })

  server.events.on('response', (request) => {
    const rec = {}
    formatHttpRequest(rec, request)
    formatHttpResponse(rec, request)

    t.deepEqual(rec.user_agent, { original: 'cool-agent' })
    t.deepEqual(rec.url, {
      path: '/',
      full: `http://localhost:${server.info.port}/`
    })
    t.deepEqual(rec.http, {
      version: '1.1',
      request: {
        method: 'GET',
        headers: {
          'user-agent': 'cool-agent',
          host: `localhost:${server.info.port}`,
          connection: 'close'
        }
      },
      response: {
        status_code: 200,
        headers: {
          foo: 'Bar',
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-cache',
          'content-length': '2',
          'accept-ranges': 'bytes'
        },
        body: {
          bytes: 2
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

    server.stop().then(function () {
      t.end()
    })
  })

  server.start().then(function () {
    t.comment('hapi server running on %s', server.info.uri)

    // Make a request so we trigger a 'response' event above.
    const req = http.get(`http://localhost:${server.info.port}/`,
      { headers: { 'user-agent': 'cool-agent' } })
    req.on('error', t.ifErr)
  })
})
