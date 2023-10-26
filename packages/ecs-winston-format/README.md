<img align="right" width="auto" height="auto" src="https://www.elastic.co/static-res/images/elastic-logo-200.png">

# @elastic/ecs-winston-format

[![npm](https://img.shields.io/npm/v/@elastic/ecs-winston-format.svg)](https://www.npmjs.com/package/@elastic/ecs-winston-format)
[![test](https://github.com/elastic/ecs-logging-nodejs/actions/workflows/test.yml/badge.svg)](https://github.com/elastic/ecs-logging-nodejs/actions/workflows/test.yml)

This Node.js package provides a formatter for the
[winston](https://github.com/winstonjs/winston) logger compatible with
[Elastic Common Schema (ECS) logging](https://www.elastic.co/guide/en/ecs-logging/overview/master/intro.html).
In combination with the [filebeat](https://www.elastic.co/products/beats/filebeat)
shipper, you can send your logs directly to Elasticsearch and leverage
[Kibana's Logs app](https://www.elastic.co/guide/en/observability/current/monitor-logs.html)
to inspect all logs in one single place.

`winston` 3.x versions are supported.

Please see the [Node.js ECS winston documentation](https://www.elastic.co/guide/en/ecs-logging/nodejs/current/winston.html).


## Install

```sh
npm install @elastic/ecs-winston-format
```

## Usage

```js
const winston = require('winston');
const { ecsFormat } = require('@elastic/ecs-winston-format');

const logger = winston.createLogger({
  level: 'info',
  format: ecsFormat(/* options */),
  transports: [
    new winston.transports.Console()
  ]
});

logger.info('hi');
logger.error('oops there is a problem', { foo: 'bar' });
```

Running this script will produce log output similar to the following:

```sh
% node examples/basic.js
{"@timestamp":"2021-01-13T21:32:38.095Z","log.level":"info","message":"hi","ecs":{"version":"8.10.0"}}
{"@timestamp":"2021-01-13T21:32:38.096Z","log.level":"error","message":"oops there is a problem","ecs":{"version":"8.10.0"},"foo":"bar"}
```

Please see the [Node.js ECS winston documentation](https://www.elastic.co/guide/en/ecs-logging/nodejs/current/winston.html) for more.

## License

This software is licensed under the [Apache 2 license](./LICENSE).
