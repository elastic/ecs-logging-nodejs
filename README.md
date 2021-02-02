<img align="right" width="auto" height="auto" src="https://www.elastic.co/static-res/images/elastic-logo-200.png">

# ecs-logging-nodejs

[![Build Status](https://apm-ci.elastic.co/buildStatus/icon?job=apm-agent-nodejs%2Fecs-logging-nodejs-mbp%2Fmaster)](https://apm-ci.elastic.co/job/apm-agent-nodejs/job/ecs-logging-nodejs-mbp/job/master/)  [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)

This set of libraries allows you to transform your application logs to structured logs that comply with the [Elastic Common Schema (ECS)](https://www.elastic.co/guide/en/ecs/current/ecs-reference.html).
In combination with [filebeat](https://www.elastic.co/products/beats/filebeat) you can send your logs directly to Elasticsearch and leverage [Kibana's Logs UI](https://www.elastic.co/guide/en/infrastructure/guide/current/logs-ui-overview.html) to inspect all logs in one single place.
See [ecs-logging](https://github.com/elastic/ecs-logging) for other ECS logging libraries and more resources about ECS & logging.

---

**Please note** that the packages provided from this repo are in **beta** and
backwards-incompatible changes might be introduced in releases during the
"0.x" series. "1.0.0" versions will be released when no longer in beta.

---

### Supported logging frameworks

- [Pino](https://getpino.io/#/) via [@elastic/ecs-pino-format](./loggers/pino)
- [Winston](https://github.com/winstonjs/winston) via [@elastic/ecs-winston-format](./loggers/winston)
- [Morgan](https://github.com/expressjs/morgan) via [@elastic/ecs-morgan-format](./loggers/morgan)

### References

* Introduction to ECS [blog post](https://www.elastic.co/blog/introducing-the-elastic-common-schema).
* Logs UI [blog post](https://www.elastic.co/blog/infrastructure-and-logs-ui-new-ways-for-ops-to-interact-with-elasticsearch).

## License

This software is licensed under the [Apache 2 license](./LICENSE).
