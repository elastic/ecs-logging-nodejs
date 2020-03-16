<img align="right" width="auto" height="auto" src="https://www.elastic.co/static-res/images/elastic-logo-200.png">

# ecs-logging-js

[![Build Status](https://apm-ci.elastic.co/buildStatus/icon?job=apm-agent-nodejs%2Fecs-logging-js-mbp%2Fmaster)](https://apm-ci.elastic.co/job/apm-agent-nodejs/job/ecs-logging-js-mbp/job/master/)  [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)

This set of libraries allows you to transform your application logs to structured logs that comply with the [Elastic Common Schema (ECS)](https://www.elastic.co/guide/en/ecs/current/ecs-reference.html).
In combination with [filebeat](https://www.elastic.co/products/beats/filebeat) you can send your logs directly to Elasticsearch and leverage [Kibana's Logs UI](https://www.elastic.co/guide/en/infrastructure/guide/current/logs-ui-overview.html) to inspect all logs in one single place.
See [ecs-logging](https://github.com/elastic/ecs-logging) for other ECS logging libraries and more resources about ECS & logging.

### Supported loggers
- [pino](https://github.com/elastic/ecs-logging-js/tree/master/loggers/pino)
- [winston](https://github.com/elastic/ecs-logging-js/tree/master/loggers/winston)
- [morgan](https://github.com/elastic/ecs-logging-js/tree/master/loggers/morgan)

### References
* Introduction to ECS [blog post](https://www.elastic.co/blog/introducing-the-elastic-common-schema).
* Logs UI [blog post](https://www.elastic.co/blog/infrastructure-and-logs-ui-new-ways-for-ops-to-interact-with-elasticsearch).

## License
This software is licensed under the [Apache 2 license](./LICENSE).
