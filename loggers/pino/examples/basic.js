// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const pino = require('pino')({ ...require('../') })

pino.info('Hello world')

const child = pino.child({ module: 'foo' })
child.warn('From child')
