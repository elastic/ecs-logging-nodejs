# @elastic/winston-ecs-format

A formatter for the [winston](https://www.npmjs.com/package/winston) logger compatible with [Elastic Common Schema](https://www.elastic.co/guide/en/ecs/current/index.html).

## Install
```sh
npm i @elastic/winston-ecs-format
```

## Usage
```js
const winston = require('winston')
const ecsFormat = require('@elastic/winston-ecs-format')

const logger = winston.createLogger({
  level: 'info',
  format: ecsFormat(),
  transports: [
    new winston.transports.Console()
  ]
})

logger.info('ecs is cool!')
logger.error('ecs is cool!', { hello: 'world' })
```

## License
[Apache 2.0](./LICENSE)
