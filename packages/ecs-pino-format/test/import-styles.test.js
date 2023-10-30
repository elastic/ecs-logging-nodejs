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
const glob = require('glob')
const path = require('path')
const semver = require('semver')
const test = require('tap').test

const { ecsLoggingValidate } = require('../../../utils/lib/ecs-logging-validate')

const ajv = new Ajv({
  allErrors: true,
  verbose: true
})
addFormats(ajv)
const validate = ajv.compile(require('../../../utils/schema.json'))

const TS_NODE = execSync('npm exec which ts-node').toString().trim()
const IS_TSC_SUPPORTED = semver.satisfies(process.version, '>=14.17')
const IS_ESM_SUPPORTED = semver.satisfies(process.version, '>=12')
const TEST_SKIP_SLOW = ['1', 'true'].includes(process.env.TEST_SKIP_SLOW)

test('import styles', suite => {
  const importCases = [
    { file: 'fixtures/js-require-default.js' },
    { file: 'fixtures/js-require-named.js' },
    {
      file: 'fixtures/js-esm-import.mjs',
      testOpts: {
        skip: !IS_ESM_SUPPORTED ? `ESM named import does not support node ${process.version}` : false
      }
    }
  ]
  if (!TEST_SKIP_SLOW) {
    // Run each of the *.ts files with each of the tsconfig-*.json files
    const TSCONFIGS = glob.sync(path.join(__dirname, '/fixtures/tsconfig-*.json'))
    const TSSCRIPTS = glob.sync(path.join(__dirname, '/fixtures/*.ts'))
    for (const tsconfig of TSCONFIGS) {
      for (const tsscript of TSSCRIPTS) {
        importCases.push({
          exec: TS_NODE,
          opts: ['-P', path.relative(__dirname, tsconfig)],
          file: path.relative(__dirname, tsscript),
          testOpts: {
            skip: !IS_TSC_SUPPORTED ? `tsc@5 does not support node ${process.version}` : false
          }
        })
      }
    }
  }

  importCases.forEach((ic) => {
    const exec = ic.exec || process.execPath
    const args = (ic.opts ? ic.opts.slice() : []).concat([ic.file])
    const summary = `${path.basename(exec)} ${args.join(' ')}`

    suite.test(summary, ic.testOpts || {}, t => {
      execFile(
        exec,
        args,
        {
          cwd: __dirname,
          timeout: 5000 // A guard in case the script hangs.
        },
        function (err, stdout, stderr) {
          t.error(err, 'script exited successfully')
          const rec = JSON.parse(stdout)
          t.ok(rec, 'got a single log record')
          t.equal(rec.message, 'hi', 'log message is "hi"')
          t.ok(validate(rec), 'rec is valid')
          t.equal(ecsLoggingValidate(stdout, { ignoreIndex: true }), null)
          t.end()
        }
      )
    })
  })

  suite.end()
})
