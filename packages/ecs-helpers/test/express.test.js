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

async function makeARequest(url, opts) {
  return new Promise((resolve, reject) => {
    const clientReq = http.request(url, opts, function (clientRes) {
      const chunks = []
      clientRes.on('data', function (chunk) {
        chunks.push(chunk)
      })
      clientRes.on('end', function () {
        resolve({
          statusCode: clientRes.statusCode,
          headers: clientRes.headers,
          body: chunks.join('')
        })
      })
    })
    clientReq.on('error', reject)
    clientReq.end()
  })
}

test('express res/req serialization', t => {
  const app = express()
  let server

  app.get('/apath', (req, res) => {
    const rec = {}

    res.setHeader('Foo', 'Bar')
    res.write('hi')
    res.end()

    let rv = formatHttpRequest(rec, req)
    t.ok(rv, 'formatHttpRequest processed req')
    rv = formatHttpResponse(rec, res)
    t.ok(rv, 'formatHttpResponse processed res')

    t.same(rec.user_agent, { original: 'cool-agent' })
    t.same(rec.url, {
      full: `http://127.0.0.1:${server.address().port}/apath?aquery`,
      path: '/apath',
      query: 'aquery',
      domain: '127.0.0.1'
    })
    t.same(rec.http, {
      version: '1.1',
      request: {
        id: 'arequestid',
        method: 'GET',
        headers: {
          'user-agent': 'cool-agent',
          host: `127.0.0.1:${server.address().port}`,
          'x-request-id': 'arequestid',
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
    t.ok(rec.client.address === '127.0.0.1', 'client.address is set')
    t.ok(rec.client.ip === rec.client.address,
      'client.address duplicated to client.ip')
    t.equal(typeof (rec.client.port), 'number')
  })

  const aRouter = express.Router()
  aRouter.get('/asubpath', (req, res) => {
    res.end('hi')

    const rec = {}
    let rv = formatHttpRequest(rec, req)
    t.ok(rv, 'formatHttpRequest processed req')
    rv = formatHttpResponse(rec, res)
    t.ok(rv, 'formatHttpResponse processed res')

    const port = server.address().port
    t.same(rec, {
      'http': {
        version: '1.1',
        request: {
          method: 'GET',
          headers: {
            host: `127.0.0.1:${port}`,
            connection: 'close'
          }
        },
        response: {
          status_code: 200,
          headers: {
            'x-powered-by': 'Express'
          }
        }
      },
      'url': {
        full: `http://127.0.0.1:${port}/arouter/asubpath`,
        path: '/arouter/asubpath',
        domain: '127.0.0.1'
      },
      'client': {
        "address": "127.0.0.1",
        "ip": "127.0.0.1",
        port: req.socket.remotePort
      },
    })
  })
  app.use('/arouter', aRouter)

  app.listen(0, '127.0.0.1', async function () {
    server = this

    await Promise.all([
      makeARequest(
        `http://127.0.0.1:${server.address().port}/apath?aquery#ahash`,
        {
          headers: {
            'user-agent': 'cool-agent',
            connection: 'close',
            'x-request-id': 'arequestid'
          }
        }
      ),
      makeARequest(`http://127.0.0.1:${server.address().port}/arouter/asubpath`)
    ])

    server.close(() => {
      t.end()
    })
  })
})
