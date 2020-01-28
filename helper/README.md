# @elastic/ecs-helper

A set of helpers for the ECS logging libraries.  
You should not directly used this package, but the ECS logging libraries instead.

## Install
```sh
npm i @elastic/ecs-helper
```

## API

### `stringify`
Function that serializes (very quickly!) an ECS object.

```js
const { stringify } = require('@elastic/ecs-helper')
const ecs = {
  '@timestamp': new Date().toISOString(),
  log: {
    level: 'info',
    logger: 'test'
  },
  message: 'hello world',
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
const { formatHttpRequest } = require('@elastic/ecs-helper')
const ecs = {
  '@timestamp': new Date().toISOString(),
  log: {
    level: 'info',
    logger: 'test'
  },
  message: 'hello world',
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
const { formatHttpResponse } = require('@elastic/ecs-helper')
const ecs = {
  '@timestamp': new Date().toISOString(),
  log: {
    level: 'info',
    logger: 'test'
  },
  message: 'hello world',
  ecs: {
    version: '1.4.0'
  }
}

formatHttpResponse(ecs, request)
console.log(ecs)
```

## License
[Apache 2.0](./LICENSE)
