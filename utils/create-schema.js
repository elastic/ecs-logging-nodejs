// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

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
//      cd .../ecs-logging-js/utils
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
const properties = getAllFiles(ecsSchemasDir)
  .filter(file => !file.includes('README.md'))
  .map(file => fs.readFileSync(file, 'utf8'))
  .map(yaml.safeLoad)
  .reduce((acc, [val]) => {
    var properties = {}
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
const gitInfo = execSync(`git log -1 --pretty=format:'commit %h%d'`, {
  cwd: ecsRepo
})
const comment = `ecs.git ${gitInfo}`
const jsonSchema = JSON.stringify({
  '$comment': comment,
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
  var index = -1
  var length = objPath.length
  var lastIndex = length - 1
  var nested = object

  while (nested != null && ++index < length) {
    var key = objPath[index]
    var newValue = value

    if (index !== lastIndex) {
      var objValue = nested[key]
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
      return { type: 'string' }
    case 'integer':
      return { type: 'integer' }
    case 'long':
    case 'float':
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
      return {
        type: 'object',
        additionalProperties: true
      }
    default:
      throw new Error(`Can't handle the type '${type}'`)
  }
}

function usageError(msg) {
  const prog = path.basename(process.argv[1])
  process.stderr.write(`${prog}: error: ${msg}\n`)
  process.stderr.write('usage: node create-schema $ecsRepo\n')
  process.exit(1)
}
