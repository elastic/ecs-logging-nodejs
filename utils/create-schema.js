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

// Create a schema (in https://json-schema.org/ format) from the YAML schema
// files at https://github.com/elastic/ecs/tree/master/schemas for use in
// validation tests.
//
// Usage:
// 1. Get a clone and checkout of the intended tag of ecs.git. This tag should
//    match the "version" at "../helpers/lib/index.js":
//      git clone git@github.com:elastic/ecs.git
//      cd ecs
//      git checkout TAG   # e.g. v1.5.0
// 2. Re-generate the JSON schema file:
//      cd .../ecs-logging-nodejs/utils
//      npm install
//      node create-schema.js .../ecs
// 3. Run the tests and commit the updated schema.

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

const ecsRepo = process.argv[2]
if (!ecsRepo) {
  usageError('missing $ecsRepo arg (path to a clone of elastic/ecs.git)')
} else if (!fs.existsSync(ecsRepo)) {
  usageError(`the given $ecsRepo dir does not exist: "${ecsRepo}"`)
}
const ecsSchemasDir = path.join(ecsRepo, 'schemas')

// Build the JSON schema properties from the ECS schema YAML files.
var properties = getAllFiles(ecsSchemasDir)
  .filter(file => !file.includes('README.md'))
  .map(file => fs.readFileSync(file, 'utf8'))
  .map(yaml.safeLoad)
  .filter(entry => Array.isArray(entry)) // filter out weird `{name: 'main', ...}` entry
  .reduce((acc, [val]) => {
    let properties = {}
    for (const prop of val.fields) {
      properties = set(properties, prop.name, jsonSchemaTypeFromEcsType(prop.type))
    }
    if (val.name === 'base') {
      Object.assign(acc, properties)
    } else {
      acc[val.name] = {
        type: 'object',
        properties
      }
    }
    return acc
  }, {})

// Write out a JSON schema file.
const gitInfo = execSync('git log -1 --pretty=format:\'commit %h%d\'', {
  cwd: ecsRepo
})
const comment = `ecs.git ${gitInfo}`
const jsonSchema = JSON.stringify({
  $comment: comment,
  type: 'object',
  properties,
  additionalProperties: true
}, null, 2)
const outSchemaFile = 'schema.json'
fs.writeFileSync(outSchemaFile, jsonSchema, 'utf8')
console.log(`wrote ${outSchemaFile} (${comment})`)

function getAllFiles (dir) {
  return fs.readdirSync(dir).reduce((files, file) => {
    const name = path.join(dir, file)
    const isDirectory = fs.statSync(name).isDirectory()
    return isDirectory ? [...files, ...getAllFiles(name)] : [...files, name]
  }, [])
}

function set (object, objPath, value, customizer) {
  objPath = objPath
    .split('.')
    .join('.properties.')
    .split('.')
  let index = -1
  const length = objPath.length
  const lastIndex = length - 1
  let nested = object

  while (nested != null && ++index < length) {
    const key = objPath[index]
    let newValue = value

    if (index !== lastIndex) {
      const objValue = nested[key]
      newValue = objValue || {}
    }
    if (key === 'properties') {
      nested.type = 'object'
      nested.additionalProperties = true
    }
    nested[key] = newValue
    nested = nested[key]
  }
  return object
}

function jsonSchemaTypeFromEcsType (type) {
  switch (type) {
    case 'keyword':
    case 'constant_keyword':
      return { type: 'string' }
    case 'boolean':
      return { type: 'boolean' }
    case 'date':
      return { type: 'string', format: 'date-time' }
    case 'ip':
      return {
        anyOf: [
          { type: 'string', format: 'ipv4' },
          { type: 'string', format: 'ipv6' }
        ]
      }
    case 'text':
    case 'match_only_text':
    case 'wildcard':
      return { type: 'string' }
    case 'integer':
      return { type: 'integer' }
    case 'long':
    case 'float':
    case 'scaled_float':
      return { type: 'number' }
    case 'geo_point':
      return {
        type: 'object',
        properties: {
          lat: { type: 'number' },
          lon: { type: 'number' }
        }
      }
    case 'object':
    case 'flattened':
    case 'nested':
    case 'source':
      return {
        type: 'object',
        additionalProperties: true
      }
    default:
      throw new Error(`Can't handle the type '${type}'`)
  }
}

function usageError (msg) {
  const prog = path.basename(process.argv[1])
  process.stderr.write(`${prog}: error: ${msg}\n`)
  process.stderr.write('usage: node create-schema $ecsRepo\n')
  process.exit(1)
}
