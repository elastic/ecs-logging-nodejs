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

// Min dep is triple-beam@1.1.0, which defines LEVEL and MESSAGE. SPLAT might be
// undefined.
const { LEVEL, MESSAGE, SPLAT } = require('triple-beam')
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

const stringify = safeStableStringify.configure()

/**
 * A Winston `Format` for converting fields on the `info` object to ECS logging
 * format.
 *
 * @class {import('logform').Format}
 * @param {Config} opts - See index.d.ts.
 */
class EcsFieldsTransform {
  constructor (opts) {
    this.options = opts
  }

  transform (info, opts) {
    // istanbul ignore next
    opts = opts || {}
    const convertErr = opts.convertErr != null ? opts.convertErr : true
    const convertReqRes = opts.convertReqRes != null ? opts.convertReqRes : false
    const apmIntegration = opts.apmIntegration != null ? opts.apmIntegration : true

    // Do error handling first, because for case 3 we sometimes need to
    // *replace* the `info` object. Winston has a number of ways that it does
    // something with `Error` instances passed to a logger.
    //
    // 1. `log.warn('a message', new Error('boom'))`
    //    If `info[SPLAT][0] instanceof Error`, then convert it to `error.*` fields
    //    in place of `info.stack`.
    //
    // 2. Winston logger configured to handle uncaughtException and/or unhandledRejection.
    //    If `info.exception: true` or `info.rejection: true`, and level is
    //    "error",  and `info.trace` is an Array and `info.message` starts with
    //    "uncaughtException:" or "unhandledRejection:", then convert to
    //    `error.*` fields. These conditions are to infer the `info` shape
    //    returned by Winston's `ExceptionHandler` and `RejectionHandler`.
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
    const splat0 = SPLAT && info[SPLAT] && info[SPLAT][0]
    if (splat0 instanceof Error) { // case 1
      // Undo the addition of this error's enumerable properties to the
      // top-level info object.
      err = splat0
      delete info.stack
      for (const propName in err) {
        delete info[propName]
      }
    } else if (
      (info.exception === true || info.rejection === true) &&
      info.level === 'error' &&
      Array.isArray(info.trace) &&
      (info.message.startsWith('uncaughtException:') ||
        info.message.startsWith('unhandledRejection:'))) { // case 2
      // The 'stack', 'trace', and trace in the 'message' are redundant.
      // 'date' is also redundant with '@timestamp'.
      delete info.stack
      delete info.trace
      delete info.date
      info.message = info.message.split(/\n/, 1)[0]
      // istanbul ignore else
      if (info.error instanceof Error) {
        err = info.error
      } else {
        info.error = {
          message: info.error.toString()
        }
      }
      delete info.error
      // Dev Note: We *could* translate some of the process and os fields, but
      // we don't currently.
      //    https://www.elastic.co/guide/en/ecs/current/ecs-process.html
      //    https://www.elastic.co/guide/en/ecs/current/ecs-host.html
    } else if (convertErr) {
      if (info instanceof Error) { // case 3a
        // With `log.info(err)`, Winston incorrectly uses `err` as the info
        // object -- (a) mutating it and (b) resulting in not being able to
        // differentiate `defaultMeta` and `err` properties.
        // The best we can do is, at least, not serialize `error.level` using
        // the incorrectly added `level` field.
        err = info
        info = Object.assign(
          {
            message: err.message,
            [LEVEL]: err.level
          },
          err)
        delete err.level
      } else if (info.message instanceof Error) { // case 3b
        // `log.info(err, {...})` or `log.info(new Error(''))` with empty message.
        err = info.message
        info.message = err.message
      } else if (info.err instanceof Error) { // case 4
        err = info.err
        delete info.err
      }
    }

    // If we have an Error instance, then serialize it to `error.*` fields.
    if (err) {
      // First we add err's enumerable fields, as `logform.errors()` does.
      info.error = Object.assign({}, err)
      // Then add standard ECS error fields (https://www.elastic.co/guide/en/ecs/current/ecs-error.html).
      // istanbul ignore next
      info.error.type = toString.call(err.constructor) === '[object Function]'
        ? err.constructor.name
        : err.name
      info.error.message = err.message
      info.error.stack_trace = err.stack
      // The add some additional fields. `cause` is handled by
      // `logform.errors({cause: true})`.  This implementation ensures it is
      // always a string to avoid its type varying depending on the value.
      // istanbul ignore next -- so coverage works for Node.js <16.9.0
      if (err.cause) {
        info.error.cause = err.cause instanceof Error
          ? err.cause.stack
          : err.cause.toString()
      }
    }

    // Core ECS logging fields.
    info['@timestamp'] = new Date().toISOString()
    info['log.level'] = info.level
    // Note: We do *not* remove `info.level`, even though it is not an ECS
    // field, because https://github.com/winstonjs/logform#info-objects says:
    // "Every info must have at least the level and message properties".
    // Instead, it will be excluded from serialization in `EcsStringifyTransform`.
    info['ecs.version'] = version

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
      info['service.name'] = serviceName
    }

    let serviceVersion = opts.serviceVersion
    if (serviceVersion == null && apm) {
      // istanbul ignore next
      serviceVersion = (apm.getServiceVersion
        ? apm.getServiceVersion() // added in elastic-apm-node@...
        : apm._conf.serviceVersion) // fallback to private `_conf`
    }
    if (serviceVersion) {
      info['service.version'] = serviceVersion
    }

    let serviceEnvironment = opts.serviceEnvironment
    if (serviceEnvironment == null && apm) {
      // istanbul ignore next
      serviceEnvironment = (apm.getServiceEnvironment
        ? apm.getServiceEnvironment() // added in elastic-apm-node@...
        : apm._conf.environment) // fallback to private `_conf`
    }
    if (serviceEnvironment) {
      info['service.environment'] = serviceEnvironment
    }

    let serviceNodeName = opts.serviceNodeName
    if (serviceNodeName == null && apm) {
      // istanbul ignore next
      serviceNodeName = (apm.getServiceNodeName
        ? apm.getServiceNodeName() // added in elastic-apm-node@...
        : apm._conf.serviceNodeName) // fallback to private `_conf`
    }
    if (serviceNodeName) {
      info['service.node.name'] = serviceNodeName
    }

    let eventDataset = opts.eventDataset
    if (eventDataset == null && serviceName) {
      eventDataset = serviceName
    }
    if (eventDataset) {
      info['event.dataset'] = eventDataset
    }

    // istanbul ignore else
    if (apm) {
      // https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html
      const tx = apm.currentTransaction
      if (tx) {
        info['trace.id'] = tx.traceId
        info['transaction.id'] = tx.id
        const span = apm.currentSpan
        // istanbul ignore else
        if (span) {
          info['span.id'] = span.id
        }
      }
    }

    // https://www.elastic.co/guide/en/ecs/current/ecs-http.html
    if (info.req !== undefined && convertReqRes) {
      formatHttpRequest(info, info.req)
      delete info.req
    }
    if (info.res !== undefined && convertReqRes) {
      formatHttpResponse(info, info.res)
      delete info.res
    }

    return info
  }
}

function ecsFields (opts) {
  return new EcsFieldsTransform(opts)
}

class EcsStringifyTransform {
  constructor (opts) {
    this.options = opts
  }

  transform (info, opts) {
    // `info.level` must stay (see note above), but we don't want to serialize
    // it, so exclude it from the stringified fields. There *is* a perf cost
    // for this.
    const { level, ...infoSansLevel } = info
    info[MESSAGE] = stringify(infoSansLevel)
    return info
  }
}

function ecsStringify (opts) {
  return new EcsStringifyTransform(opts)
}

/**
 * A Winston transform that composes `ecsFields(...)` and `ecsStringify()`.
 */
class EcsFormatTransform {
  constructor (opts) {
    this.options = opts
    this._fieldsTx = ecsFields(opts)
    this._stringifyTx = ecsStringify()
  }

  transform (info, opts) {
    info = this._fieldsTx.transform(info, this._fieldsTx.options)
    info = this._stringifyTx.transform(info, this._stringifyTx.options)
    return info
  }
}

function ecsFormat (opts) {
  return new EcsFormatTransform(opts)
}

// For backwards compatibility with v1.0.0, the top-level export is `ecsFormat`,
// though using the named exports is preferred.
module.exports = ecsFormat
module.exports.ecsFormat = ecsFormat
module.exports.ecsFields = ecsFields
module.exports.ecsStringify = ecsStringify
module.exports.default = ecsFormat
