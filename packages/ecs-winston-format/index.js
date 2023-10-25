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

const { MESSAGE, SPLAT } = require('triple-beam')
const safeStableStringify = require('safe-stable-stringify')
const {
  version,
  formatHttpRequest,
  formatHttpResponse
} = require('@elastic/ecs-helpers')

// We will query the Elastic APM agent if it is available.
let elasticApm = null
try {
  elasticApm = require('elastic-apm-node')
} catch (ex) {
  // Silently ignore.
}

// There are some differences between Winston's `logform.format.json()` and this
// stringifier. They both use `safe-stable-stringify`. Winston's exposes its
// options but doesn't doc that at https://github.com/winstonjs/logform#json.
// 1. This one hardcodes `deterministic: false` so fields are serialized in the
//    order added, which is helpful for ecs-logging's stated preference of
//    having a few fields first:
//    https://www.elastic.co/guide/en/ecs-logging/overview/current/intro.html#_why_ecs_logging
// 2. Winston provides a `replacer` that converts bigints to strings. Doing
//    that is debatable. The argument *for* is that a *JavaScript* JSON parser
//    looses precision when parsing a bigint.
// TODO: These differences should make it to docs somewhere.
const stringify = safeStableStringify.configure({ deterministic: false })

const reservedFields = {
  '@timestamp': true,
  error: true,
  level: true,
  'log.level': true,
  message: true,
  req: true,
  res: true
}

/**
 * A Winston `Format` for converting to ecs-logging output.
 *
 * @class {import('logform').Format}
 * @param {Config} opts - See index.d.ts.
 */
class EcsWinstonTransform {
  constructor (opts) {
    this.options = opts
  }

  transform (info, opts) {
    // istanbul ignore next
    opts = opts || {}
    const convertErr = opts.convertErr != null ? opts.convertErr : true
    const convertReqRes = opts.convertReqRes != null ? opts.convertReqRes : false
    const apmIntegration = opts.apmIntegration != null ? opts.apmIntegration : true

    const ecsFields = {
      '@timestamp': new Date().toISOString(),
      'log.level': info.level,
      message: info.message,
      'ecs.version': version
    }

    // Error handling. Winston has a number of ways that it does something with
    // `Error` instances passed to a logger.
    //
    // 1. `log.warn('a message', new Error('boom'))`
    //    If `info[SPLAT][0] instanceof Error`, then convert it to `error.*` fields
    //    in place of `info.stack`.
    //
    // 2. Winston logger configured to handle uncaughtException and/or unhandledRejection.
    //    If `info.exception: true` and level is "error" and `info.trace` is an
    //    Array and `info.message` starts with "uncaughtException:" or
    //    "unhandledRejection:", then convert to `error.*` fields. These
    //    conditions are to infer the `info` shape returned by Winston's
    //    `ExceptionHandler` and `RejectionHandler`.
    //    In this case the redundant `stack`, `trace`, `date` fields are dropped
    //    and error details are moved to the `error.*` fields.
    //
    // If `opts.convertErr === true` (the default), then the next two forms are
    // considered as well.
    //
    // 3. `log.warn(new Error('boom'))`
    //    `log.warn(new Error(''))`
    //    `log.warn(new Error('boom'), {foo: 'bar'})`
    //    If `info instanceof Error` or `info.message instanceof Error`, then
    //    convert it to `error.*` fields. The latter two are a little strange, but
    //    Winston's logger will transform that to `{ message: new Error(...) }`
    //    and "logform/errors.js" will handle that.
    //
    // 4. `log.warn('a message', { err: new Error('boom') })`
    //    If `info.err instanceof Error`, then convert to `error.*` fields.
    //    Note: This feature doesn't really belong because it extends error
    //    handling beyond what is typical in Winston. It remains for backward
    //    compatibility.
    let err
    let delErrorLevel = false
    const splat0 = SPLAT && info[SPLAT] && info[SPLAT][0]
    if (splat0 instanceof Error) { // case 1
      // Undo the addition of this error's enumerable properties to the
      // top-level info object.
      err = splat0
      delete info.stack
      for (const propName in err) {
        delete info[propName]
      }
    } else if (info.exception === true &&
      info.level === 'error' &&
      Array.isArray(info.trace) &&
      (info.message.startsWith('uncaughtException:') ||
        info.message.startsWith('unhandledRejection:'))) { // case 2
      // The 'stack', 'trace', and trace in the 'message' are redundant.
      // 'date' is also redundant with '@timestamp'.
      delete info.stack
      delete info.trace
      delete info.date
      ecsFields.message = info.message.split(/\n/, 1)[0]
      // istanbul ignore else
      if (info.error instanceof Error) {
        err = info.error
      } else {
        ecsFields.error = {
          message: info.error.toString()
        }
      }
      delete info.error
      // Dev Note: We *could* translate some of the process and os fields, but
      // we don't currently.
      //    https://www.elastic.co/guide/en/ecs/current/ecs-process.html
      //    https://www.elastic.co/guide/en/ecs/current/ecs-host.html
    } else if (convertErr) { // cases 3 and 4
      if (info instanceof Error) {
        // With `log.info(err)`, Winston incorrectly uses `err` as the info
        // object -- (a) mutating it and (b) resulting in not being able to
        // differentiate `defaultMeta` and `err` properties.
        // The best we can do is, at least, not serialize `error.level` using
        // the incorrectly added `level` field.
        err = info
        delErrorLevel = true
      } else if (info.message instanceof Error) {
        // `log.info(err, {...})` or `log.info(new Error(''))` with empty message.
        err = info.message
        ecsFields.message = err.message
      } else if (info.err instanceof Error) {
        err = info.err
        delete info.err
      }
    }

    // If we have an Error instance, then serialize it to `error.*` fields.
    if (err) {
      // First we add err's enumerable fields, as `logform.errors()` does.
      ecsFields.error = Object.assign({}, err)
      if (delErrorLevel) {
        delete ecsFields.error.level
      }
      // Then add standard ECS error fields (https://www.elastic.co/guide/en/ecs/current/ecs-error.html).
      // istanbul ignore next
      ecsFields.error.type = toString.call(err.constructor) === '[object Function]'
        ? err.constructor.name
        : err.name
      ecsFields.error.message = err.message
      ecsFields.error.stack_trace = err.stack
      // The add some additional fields. `cause` is handled by
      // `logform.errors({cause: true})`.  This implementation ensures it is
      // always a string to avoid its type varying depending on the value.
      // istanbul ignore next -- so coverage works for Node.js <16.9.0
      if (err.cause) {
        ecsFields.error.cause = err.cause instanceof Error
          ? err.cause.stack
          : err.cause.toString()
      }
    }

    // Add all unreserved fields.
    const keys = Object.keys(info)
    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i]
      if (!reservedFields[key]) {
        ecsFields[key] = info[key]
      }
    }

    let apm = null
    if (apmIntegration && elasticApm && elasticApm.isStarted && elasticApm.isStarted()) {
      apm = elasticApm
    }

    // Set a number of correlation fields from (a) the given options or (b) an
    // APM agent, if there is one running.
    let serviceName = opts.serviceName
    if (serviceName == null && apm) {
      // istanbul ignore next
      serviceName = (apm.getServiceName
        ? apm.getServiceName() // added in elastic-apm-node@3.11.0
        : apm._conf.serviceName) // fallback to private `_conf`
    }
    if (serviceName) {
      ecsFields['service.name'] = serviceName
    }

    let serviceVersion = opts.serviceVersion
    if (serviceVersion == null && apm) {
      // istanbul ignore next
      serviceVersion = (apm.getServiceVersion
        ? apm.getServiceVersion() // added in elastic-apm-node@...
        : apm._conf.serviceVersion) // fallback to private `_conf`
    }
    if (serviceVersion) {
      ecsFields['service.version'] = serviceVersion
    }

    let serviceEnvironment = opts.serviceEnvironment
    if (serviceEnvironment == null && apm) {
      // istanbul ignore next
      serviceEnvironment = (apm.getServiceEnvironment
        ? apm.getServiceEnvironment() // added in elastic-apm-node@...
        : apm._conf.environment) // fallback to private `_conf`
    }
    if (serviceEnvironment) {
      ecsFields['service.environment'] = serviceEnvironment
    }

    let serviceNodeName = opts.serviceNodeName
    if (serviceNodeName == null && apm) {
      // istanbul ignore next
      serviceNodeName = (apm.getServiceNodeName
        ? apm.getServiceNodeName() // added in elastic-apm-node@...
        : apm._conf.serviceNodeName) // fallback to private `_conf`
    }
    if (serviceNodeName) {
      ecsFields['service.node.name'] = serviceNodeName
    }

    let eventDataset = opts.eventDataset
    if (eventDataset == null && serviceName) {
      eventDataset = serviceName
    }
    if (eventDataset) {
      ecsFields['event.dataset'] = eventDataset
    }

    // istanbul ignore else
    if (apm) {
      // https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html
      const tx = apm.currentTransaction
      if (tx) {
        ecsFields['trace.id'] = tx.traceId
        ecsFields['transaction.id'] = tx.id
        const span = apm.currentSpan
        // istanbul ignore else
        if (span) {
          ecsFields['span.id'] = span.id
        }
      }
    }

    // https://www.elastic.co/guide/en/ecs/current/ecs-http.html
    if (info.req !== undefined) {
      if (convertReqRes) {
        formatHttpRequest(ecsFields, info.req)
      } else {
        ecsFields.req = info.req
      }
    }
    if (info.res !== undefined) {
      if (convertReqRes) {
        formatHttpResponse(ecsFields, info.res)
      } else {
        ecsFields.res = info.res
      }
    }

    info[MESSAGE] = stringify(ecsFields)
    return info
  }
}

module.exports = opts => new EcsWinstonTransform(opts)
