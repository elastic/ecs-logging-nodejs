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

// Test all the supported import styles: for CommonJS, ESM, and TypeScript.
// Each case is a JS or TS file in "test/fixtures/...".
//
// Note that we intentionally do NOT support the TypeScript-only
// `import ecsFormat = require('...')` format
// (https://www.typescriptlang.org/docs/handbook/modules.html#export--and-import--require)

const addFormats = require('ajv-formats').default
const Ajv = require('ajv').default
const { execFile, execSync } = require('child_process')
const path = require('path')
const test = require('tap').test

const { ecsLoggingValidate } = require('../../../utils/lib/ecs-logging-validate')

const ajv = new Ajv({
  allErrors: true,
  verbose: true
})
addFormats(ajv)
const validate = ajv.compile(require('../../../utils/schema.json'))

test('import cases', suite => {
  const importCases = [
    { file: 'fixtures/js-require-default.js' },
    { file: 'fixtures/js-require-destructuring.js' },
    {
      file: 'fixtures/js-esm-import.mjs',
      testOpts: {
        skip: Number(process.versions.node.split('.')[0]) <= 10
          ? 'ESM does not work with node <=10'
          : false
      }
    },
    // TypeScript using esModuleInterop:true (the default setting from
    // `tsc --init`).
    {
      file: 'fixtures/ts-esModuleInterop/ts-import-default.js',
      build: 'pwd && ls && cd fixtures/ts-esModuleInterop && npx tsc ts-import-default.ts'
    },
    {
      file: 'fixtures/ts-esModuleInterop/ts-import-destructuring.js',
      build: 'pwd && ls && cd fixtures/ts-esModuleInterop && npx tsc ts-import-destructuring.ts'
    },
    {
      file: 'fixtures/ts-esModuleInterop/ts-import-star.js',
      build: 'pwd && ls && cd fixtures/ts-esModuleInterop && npx tsc ts-import-star.ts'
    },
    {
      file: 'fixtures/ts-esModuleInterop/ts-require.js',
      build: 'pwd && ls && cd fixtures/ts-esModuleInterop && npx tsc ts-require.ts'
    },
    // TypeScript using esModuleInterop:false.
    {
      file: 'fixtures/ts-noEsModuleInterop/ts-import-default.js',
      build: 'pwd && ls && cd fixtures/ts-noEsModuleInterop && npx tsc ts-import-default.ts'
    },
    {
      file: 'fixtures/ts-noEsModuleInterop/ts-import-destructuring.js',
      build: 'pwd && ls && cd fixtures/ts-noEsModuleInterop && npx tsc ts-import-destructuring.ts'
    },
    {
      file: 'fixtures/ts-noEsModuleInterop/ts-import-star.js',
      build: 'pwd && ls && cd fixtures/ts-noEsModuleInterop && npx tsc ts-import-star.ts'
    },
    {
      file: 'fixtures/ts-noEsModuleInterop/ts-require.js',
      build: 'pwd && ls && cd fixtures/ts-noEsModuleInterop && npx tsc ts-require.ts'
    }
  ]

  importCases.forEach((ic) => {
    suite.test('import case: ' + ic.file, ic.testOpts || {}, t => {
      if (ic.build) {
        execSync(ic.build, {
          cwd: __dirname,
          encoding: 'utf8'
        })
      }

      let args = [path.join(__dirname, ic.file)]
      if (ic.nodeOptions) {
        args = ic.nodeOptions.concat(args)
      }
      execFile(
        process.execPath,
        args,
        { timeout: 5000 }, // A guard in case the script hangs.
        function (err, stdout, stderr) {
          t.error(err)
          const rec = JSON.parse(stdout)
          t.ok(rec, 'got a single log record')
          t.equal(rec.message, 'hi', 'log message is "hi"')
          t.ok(validate(rec))
          t.equal(ecsLoggingValidate(stdout, { ignoreIndex: true }), null)
          t.end()
        }
      )
    })
  })

  suite.end()
})
