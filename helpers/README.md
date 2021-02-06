<img align="right" width="auto" height="auto" src="https://www.elastic.co/static-res/images/elastic-logo-200.png">

# @elastic/ecs-helpers

[![Build Status](https://apm-ci.elastic.co/buildStatus/icon?job=apm-agent-nodejs%2Fecs-logging-nodejs-mbp%2Fmaster)](https://apm-ci.elastic.co/job/apm-agent-nodejs/job/ecs-logging-nodejs-mbp/job/master/)  [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)

A set of helpers for the ECS logging libraries.
You should not directly used this package, but the ECS logging libraries instead.

## Install

```sh
npm install @elastic/ecs-helpers
```

## API

### `version`

The currently supported version of [Elastic Common Schema](https://www.elastic.co/guide/en/ecs/current/index.html).

### `stringify`

Function that serializes (very quickly!) an ECS-format log record object.

```js
const { stringify } = require('@elastic/ecs-helpers')
const ecs = {
  '@timestamp': new Date().toISOString(),
  'log.level': 'info',
  message: 'hello world',
  log: {
    logger: 'test'
  },
  ecs: {
    version: '1.4.0'
  }
}

console.log(stringify(ecs))
```

Note: This uses [fast-json-stringify](https://github.com/fastify/fast-json-stringify)
for serialization. By design this chooses speed over supporting serialization
of objects with circular references. This generally means that ecs-logging-nodejs
libraries will throw a "Converting circular structure to JSON" exception if an
attempt is made to log an object with circular references.

### `formatError`

A function that adds [ECS Error fields](https://www.elastic.co/guide/en/ecs/current/ecs-error.html)
for a given `Error` object.

```js
const { formatError } = require('@elastic/ecs-helpers')
const logRecord = { msg: 'oops', /* ... */ }
formatError(logRecord, new Error('boom'))
console.log(logRecord)
```

will show:

```js
{
  msg: 'oops',
  error: {
    type: 'Error',
    message: 'boom',
    stack_trace: 'Error: boom\n' +
      '    at REPL30:1:26\n' +
      '    at Script.runInThisContext (vm.js:133:18)\n' +
      // ...
  }
}
```

The ECS logging libraries typically use this to automatically handle an `err`
metadata field passed to a logging statement. E.g.
`log.warn({err: myErr}, '...')` for pino, `log.warn('...', {err: myErr})`
for winston.

### `formatHttpRequest`

Function that enhances an ECS object with http request data.
The request object should be Node.js's core
[`http.IncomingMessage`](https://nodejs.org/api/all.html#http_class_http_incomingmessage),
or [Express's request object](https://expressjs.com/en/5x/api.html#req) that
extends it.

```js
const { formatHttpRequest } = require('@elastic/ecs-helpers')
const ecs = {
  '@timestamp': new Date().toISOString(),
  'log.level': 'info',
  message: 'hello world',
  log: {
    logger: 'test'
  },
  ecs: {
    version: '1.4.0'
  }
}

formatHttpRequest(ecs, request)
console.log(ecs)
```

### `formatHttpResponse`

Function that enhances an ECS object with http response data.
The response object should be Node.js's core
[`http.ServerResponse`](https://nodejs.org/api/all.html#http_class_http_serverresponse),
or [Express's response object](https://expressjs.com/en/5x/api.html#res) that
extends it.

```js
const { formatHttpResponse } = require('@elastic/ecs-helpers')
const ecs = {
  '@timestamp': new Date().toISOString(),
  'log.level': 'info',
  message: 'hello world',
  log: {
    logger: 'test'
  },
  ecs: {
    version: '1.4.0'
  }
}

formatHttpResponse(ecs, request)
console.log(ecs)
```

## License

This software is licensed under the [Apache 2 license](./LICENSE).
