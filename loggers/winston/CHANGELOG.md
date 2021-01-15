# @elastic/ecs-winston-format Changelog

## Unreleased

- Fix guarding of the top-level 'log' and 'log.level' fields. A log statement
  can now set ['log' fields](https://www.elastic.co/guide/en/ecs/current/ecs-log.html)
  e.g.:

  ```
  log.info('hi', { log: { logger: 'myService' } })
  ```

  Also 'log.level' can now not accidentally be overwritten in a log statement.

- BREAKING CHANGE: Conversion of HTTP request and response objects is no longer
  done by default. One must use the new `convertReqRes: true` formatter option.
  As well, only the meta keys `req` and `res` will be handled. Before this
  change the meta keys `req`, `res`, `request`, and `response` would all be
  handled. ([#32](https://github.com/elastic/ecs-logging-js/pull/32))

  Before (no longer works):

  ```
  const logger = winston.createLogger({
    format: ecsFormat(),
    // ...
  })

  http.createServer(function handler (request, response) {
    // ...
    logger.info('handled request', { request, response })
  })
  ```

  After:

  ```
  const logger = winston.createLogger({
    format: ecsFormat({convertReqRes: true}),  // <-- specify convertReqRes option
    // ...
  })

  http.createServer(function handler (req, res) {
    // ...
    logger.info('handled request', { req, res })  // <-- only `req` and `res` are special
  })
  ```

## v0.3.0

- Serialize "log.level" as a top-level dotted field per
  https://github.com/elastic/ecs-logging/pull/33.
  [#23](https://github.com/elastic/ecs-logging-js/pull/23)

## v0.2.0

- Use the version number provided by ecs-helpers - [#13](https://github.com/elastic/ecs-logging-js/pull/13)

## v0.1.0

Initial release.
