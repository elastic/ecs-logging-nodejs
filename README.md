<img align="right" width="auto" height="auto" src="https://www.elastic.co/static-res/images/elastic-logo-200.png">

# ecs-logging-nodejs

[![Build Status](https://apm-ci.elastic.co/buildStatus/icon?job=apm-agent-nodejs%2Fecs-logging-nodejs-mbp%2Fmain)](https://apm-ci.elastic.co/job/apm-agent-nodejs/job/ecs-logging-nodejs-mbp/job/main/)  [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)

This set of libraries allows you to transform your application logs to structured logs that comply with the [Elastic Common Schema (ECS)](https://www.elastic.co/guide/en/ecs/current/ecs-reference.html).
In combination with [filebeat](https://www.elastic.co/products/beats/filebeat) you can send your logs directly to Elasticsearch and leverage [Kibana's Logs app](https://www.elastic.co/guide/en/observability/current/monitor-logs.html) to inspect all logs in one single place.

Please see the [Node.js ECS logging documentation](https://www.elastic.co/guide/en/ecs-logging/nodejs/current/intro.html).


## Supported logging frameworks

- [Morgan](https://github.com/expressjs/morgan) via [@elastic/ecs-morgan-format](./packages/ecs-morgan-format)
  ([docs](https://www.elastic.co/guide/en/ecs-logging/nodejs/current/morgan.html))
- [Pino](https://getpino.io/#/) via [@elastic/ecs-pino-format](./packages/ecs-pino-format)
  ([docs](https://www.elastic.co/guide/en/ecs-logging/nodejs/current/pino.html))
- [Winston](https://github.com/winstonjs/winston) via [@elastic/ecs-winston-format](./packages/ecs-winston-format)
  ([docs](https://www.elastic.co/guide/en/ecs-logging/nodejs/current/winston.html))

## Links

* Introduction to ECS [blog post](https://www.elastic.co/blog/introducing-the-elastic-common-schema).
* Logs UI [blog post](https://www.elastic.co/blog/infrastructure-and-logs-ui-new-ways-for-ops-to-interact-with-elasticsearch).

## License

This software is licensed under the [Apache 2 license](./LICENSE).
