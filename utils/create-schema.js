// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const { writeFileSync, readFileSync, readdirSync, statSync } = require('fs')
const { join } = require('path')
const yaml = require('js-yaml')

const properties = getAllFiles(join('..', '.ecs', 'schemas'))
  .filter(file => !file.includes('README.md'))
  .map(file => readFileSync(file, 'utf8'))
  .map(yaml.safeLoad)
  .reduce((acc, [val]) => {
    var properties = {}
    for (const prop of val.fields) {
      properties = set(properties, prop.name, getType(prop.type))
    }
    acc[val.name] = {
      type: 'object',
      properties
    }
    return acc
  }, {})

const jsonSchema = JSON.stringify({
  type: 'object',
  properties,
  additionalProperties: true
}, null, 2)
writeFileSync(join('.', 'schema.json'), jsonSchema, 'utf8')

function getAllFiles (dir) {
  return readdirSync(dir).reduce((files, file) => {
    const name = join(dir, file)
    const isDirectory = statSync(name).isDirectory()
    return isDirectory ? [...files, ...getAllFiles(name)] : [...files, name]
  }, [])
}

function set (object, path, value, customizer) {
  path = path
    .split('.')
    .join('.properties.')
    .split('.')
  var index = -1
  var length = path.length
  var lastIndex = length - 1
  var nested = object

  while (nested != null && ++index < length) {
    var key = path[index]
    var newValue = value

    if (index !== lastIndex) {
      var objValue = nested[key]
      newValue = objValue || {}
    }
    if (key === 'properties') {
      nested.type = 'object'
    }
    nested[key] = newValue
    nested = nested[key]
  }
  return object
}

function getType (type) {
  switch (type) {
    case 'keyword':
      return {
        anyOf: [
          { type: 'string' },
          { type: 'number' }
        ]
      }
    case 'boolean':
      return { type: 'boolean' }
    case 'text':
    case 'date':
    case 'ip':
      return { type: 'string' }
    case 'integer':
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
