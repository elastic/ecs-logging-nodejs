---
mapped_pages:
  - https://www.elastic.co/guide/en/ecs-logging/nodejs/current/intro.html
  - https://www.elastic.co/guide/en/ecs-logging/nodejs/current/index.html
---

# ECS Logging Node.js [intro]

Node.js ECS loggers are formatter plugins for your favorite logging libraries. They make it easy to format your logs into ECS-compatible JSON. In combination with [filebeat](https://www.elastic.co/products/beats/filebeat) you can send your logs directly to Elasticsearch and leverage [Kibana’s Logs app](docs-content://solutions/observability/logs/explore-logs.md) to inspect all logs in one single place.

The Node.js ECS logging formatters log structured JSON and support serialization of Error objects and HTTP Request and Response objects from Node.js core and popular web frameworks. A minimal log record includes the following fields:

```json
{
  "@timestamp": "2021-01-13T21:32:38.095Z",
  "log.level": "info",
  "message": "hi",
  "ecs.version": "8.10.0"
}
```

::::{tip}
Want to learn more about ECS, ECS logging, and other available language plugins? See the [ECS logging guide](ecs-logging://reference/intro.md).
::::


Ready to jump into Node.js ECS logging?

* [ECS Logging with Pino](/reference/pino.md)
* [ECS Logging with Winston](/reference/winston.md)
* [ECS Logging with Morgan](/reference/morgan.md)

If you’d like to try out a tutorial using Node.js ECS logging with winston, see [Ingest logs from a Node.js web application using Filebeat](docs-content://manage-data/ingest/ingesting-data-from-applications/ingest-logs-from-nodejs-web-application-using-filebeat.md).

