<img align="right" width="auto" height="auto" src="https://www.elastic.co/static-res/images/elastic-logo-200.png">

# @elastic/ecs-helpers

[![Build Status](https://apm-ci.elastic.co/buildStatus/icon?job=apm-agent-nodejs%2Fecs-logging-js-mbp%2Fmaster)](https://apm-ci.elastic.co/job/apm-agent-nodejs/job/ecs-logging-js-mbp/job/master/)  [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)

A set of helpers for the ECS logging libraries.
You should not directly used this package, but the ECS logging libraries instead.

## Install
```sh
npm i @elastic/ecs-helpers
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

### `formatHttpRequest`
Function that enhances an ECS object with http request data.
The request object should be Node.js's core request object.

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
The response object should be Node.js's core response object.

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
