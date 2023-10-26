<img align="right" width="auto" height="auto" src="https://www.elastic.co/static-res/images/elastic-logo-200.png">

# ecs-logging-nodejs

[![test](https://github.com/elastic/ecs-logging-nodejs/actions/workflows/test.yml/badge.svg)](https://github.com/elastic/ecs-logging-nodejs/actions/workflows/test.yml)

This set of libraries allows you to transform your application logs to structured logs that comply with the [Elastic Common Schema (ECS)](https://www.elastic.co/guide/en/ecs/current/ecs-reference.html).
In combination with [filebeat](https://www.elastic.co/products/beats/filebeat) you can send your logs directly to Elasticsearch and leverage [Kibana's Logs app](https://www.elastic.co/guide/en/observability/current/monitor-logs.html) to inspect all logs in one single place.

Please see the [Node.js ECS logging documentation](https://www.elastic.co/guide/en/ecs-logging/nodejs/current/intro.html).


## Supported logging frameworks

- Pino via [@elastic/ecs-pino-format](./packages/ecs-pino-format)
  ([docs](https://www.elastic.co/guide/en/ecs-logging/nodejs/current/pino.html),
  [changelog](./packages/ecs-pino-format/CHANGELOG.md))
- Winston via [@elastic/ecs-winston-format](./packages/ecs-winston-format)
  ([docs](https://www.elastic.co/guide/en/ecs-logging/nodejs/current/winston.html),
  [changelog](./packages/ecs-winston-format/CHANGELOG.md))
- Morgan via [@elastic/ecs-morgan-format](./packages/ecs-morgan-format)
  ([docs](https://www.elastic.co/guide/en/ecs-logging/nodejs/current/morgan.html),
  [changelog](./packages/ecs-morgan-format/CHANGELOG.md))

## Links

* Introduction to ECS [blog post](https://www.elastic.co/blog/introducing-the-elastic-common-schema).
* Logs UI [blog post](https://www.elastic.co/blog/infrastructure-and-logs-ui-new-ways-for-ops-to-interact-with-elasticsearch).

## License

This software is licensed under the [Apache 2 license](./LICENSE).
