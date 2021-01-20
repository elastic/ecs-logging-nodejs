// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const stringify = require('./serializer')
const httpFormatters = require('./http-formatters')

module.exports = {
  version: '1.5.0',
  stringify,
  ...httpFormatters
}
