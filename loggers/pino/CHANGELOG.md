# @elastic/ecs-pino-format Changelog

## v0.2.0

- Serialize "log.level" as a top-level dotted field per
  https://github.com/elastic/ecs-logging/pull/33 and
  set ["log.logger"](https://www.elastic.co/guide/en/ecs/current/ecs-log.html#field-log-logger)
  to the logger ["name"](https://getpino.io/#/docs/api?id=name-string) if given.
  ([#23](https://github.com/elastic/ecs-logging-js/pull/23))

## v0.1.0

Initial release.
