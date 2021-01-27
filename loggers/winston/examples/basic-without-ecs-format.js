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

// This shows a basic Winston logging config *without ECS logging formatting*
// for comparison with "basic.js". E.g. compare with `diff -u basic*.js`.

const winston = require('winston')

const logger = winston.createLogger({
  level: 'info',
  // Using @elastic/ecs-winston-format compares most closely with this
  // winston format:
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
})

logger.info('hi')
logger.error('oops there is a problem', { foo: 'bar' })
