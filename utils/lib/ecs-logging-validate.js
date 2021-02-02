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

// A package to validate ECS log records against the ecs-logging.git spec.

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const { hasOwnProperty } = Object.prototype
const SPEC_PATH = path.resolve(__dirname, '..', 'ecs-logging', 'spec.json')

class EcsLoggingValidationError extends Error {
  constructor (details) {
    assert(details.length, 'non-empty details array is provided')
    const message = details.map(d => d.message).join(', ')
    super(message)
    this.details = details
  }
}

function loadSpec () {
  return JSON.parse(fs.readFileSync(SPEC_PATH))
}

// Lookup the property `name` (given in dot-notation) in the object `obj`.
// Name "foo.bar" will return 42 from both:
//    {"foo.bar": 42}
//    {"foo": {"bar": 42}}
// If the named property is not found, this returns `undefined`.
function dottedLookup (obj, name) {
  if (hasOwnProperty.call(obj, name)) {
    return obj[name]
  }
  let o = obj
  const parts = name.split('.')
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!hasOwnProperty.call(o, part)) {
      return undefined
    }
    o = o[part]
  }
  return o
}

// Validate an ecs-logging record.
//
// This returns null if the record is valid. If invalid, it returns one of:
// 1. a JSON parse error, if an invalid JSON string record is given; or
// 2. an instance of `EcsLoggingValidationError`. This Error object has a
//    `.details` array with details on each validation issue. Each detail
//    object is of the form:
//
//    {
//      "message": "...",
//      "specKey": "<the key in the spec object that failed>",
//      // The following only if the specKey is not 'index'.
//      "name": "<the field name>",
//      "spec": {/* the spec entry for this field */}
//    }
//
//    for example:
//
//    {
//      "message": "required field '@timestamp' is missing",
//      "specKey": "required",
//      "name": "@timestamp",
//      "spec": {
//         "type": "datetime",
//         "required": true,
//         "index": 0,
//         "url": "https://www.elastic.co/guide/en/ecs/current/ecs-base.html"
//      }
//    }
//
// The given record can be either a JSON string, or a parsed object. However,
// note that if a parsed object is given, then the "index" spec keys (which
// attempt to specify the order of keys in the log record) cannot be validated
// because, in general, Node's JSON parsers -- including `JSON.parse` -- do
// NOT maintain key order:
//    > Object.keys(JSON.parse('{"a":true,"1":true,"c":true,"b":true}'))
//    [ '1', 'a', 'c', 'b' ]
function ecsLoggingValidate (rec) {
  let recObj
  let recStr = null
  if (typeof (rec) === 'string') {
    recStr = rec
    try {
      recObj = JSON.parse(recStr)
    } catch (parseErr) {
      return parseErr
    }
  } else {
    recObj = rec
  }

  const details = []
  const addDetail = detail => {
    details.push(detail)
  }
  const spec = loadSpec()
  const indexedNames = [] // to handle `field.index`

  for (const [name, field] of Object.entries(spec.fields)) {
    const specKeysToHandle = Object.assign({}, field)
    delete specKeysToHandle.comment
    delete specKeysToHandle.url
    delete specKeysToHandle.default

    const recVal = dottedLookup(recObj, name)

    // field.required
    if (recVal === undefined) {
      if (field.required) {
        addDetail({
          message: `required field '${name}' is missing`,
          specKey: 'required',
          name: name,
          spec: field
        })
      }
      continue
    }
    delete specKeysToHandle.required

    // field.top_level_field
    if (field.top_level_field && !hasOwnProperty.call(recObj, name)) {
      addDetail({
        message: `field '${name}' is not a top-level field`,
        specKey: 'top_level_field',
        name: name,
        spec: field
      })
    }
    delete specKeysToHandle.top_level_field

    // field.index
    if (field.index !== undefined) {
      indexedNames[field.index] = name
    }
    delete specKeysToHandle.index

    // field.type
    switch (field.type) {
      case 'datetime':
        // We'll use the approximation that if JavaScript's `new Date()` can
        // handle it, that it roughly satisfies:
        // https://www.elastic.co/guide/en/elasticsearch/reference/current/date.html
        if (new Date(recVal).toString() === 'Invalid Date') {
          addDetail({
            message: `field '${name}' is not a valid '${field.type}'`,
            specKey: 'type',
            name: name,
            spec: field
          })
        }
        break
      case 'string':
        if (typeof (recVal) !== 'string') {
          addDetail({
            message: `field '${name}' is not a valid '${field.type}'`,
            specKey: 'type',
            name: name,
            spec: field
          })
        }
        break
      default:
        throw new Error(`unknown field type: ${field.type}`)
    }
    delete specKeysToHandle.type

    if (Object.keys(specKeysToHandle).length !== 0) {
      throw new Error('do not know how to handle these ecs-logging spec ' +
        `fields from field '${name}': ${Object.keys(specKeysToHandle).join(', ')}`)
    }
  }

  // field.index
  if (indexedNames.length > 0 && recStr) {
    let expected = ['{']
    indexedNames.forEach(n => {
      expected.push('"')
      expected.push(n)
      expected.push('":')
      expected.push(JSON.stringify(dottedLookup(recObj, n)))
      expected.push(',')
    })
    expected = expected.join('')
    if (!recStr.startsWith(expected)) {
      addDetail({
        message: `the order of fields is not the expected: ${indexedNames.join(', ')}`,
        specKey: 'index'
      })
    }
  }

  if (details.length === 0) {
    return null
  } else {
    return new EcsLoggingValidationError(details)
  }
}

module.exports = {
  ecsLoggingValidate
}
