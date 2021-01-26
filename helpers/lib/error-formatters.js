// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const { toString } = Object.prototype

// Format an Error instance into ECS-compatible fields on the `ecs` object.
// https://www.elastic.co/guide/en/ecs/current/ecs-error.html
function formatError (ecsFields, err) {
  if (!(err instanceof Error)) {
    ecsFields.err = err
    return
  }

  ecsFields.error = {
    type: toString.call(err.constructor) === '[object Function]'
      ? err.constructor.name
      : err.name,
    message: err.message,
    stack_trace: err.stack
  }
}

module.exports = { formatError }
