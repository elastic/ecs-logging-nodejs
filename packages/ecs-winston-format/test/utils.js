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

const Transport = require('winston-transport')
const { MESSAGE } = require('triple-beam')
const addFormats = require('ajv-formats').default
const Ajv = require('ajv').default

const ajv = new Ajv({
  allErrors: true,
  verbose: true
})
addFormats(ajv)
const validate = ajv.compile(require('../../../utils/schema.json'))

// Winston transport to capture logged records. Parsed JSON records are on
// `.records`. Raw records (what Winston calls `info` objects) are on `.infos`.
class CaptureTransport extends Transport {
  constructor () {
    super()
    this.records = []
    this.infos = []
  }

  log (info, callback) {
    this.infos.push(info)
    const record = JSON.parse(info[MESSAGE])
    this.records.push(record)
    callback()
  }
}

module.exports = {
  validate,
  CaptureTransport
}

