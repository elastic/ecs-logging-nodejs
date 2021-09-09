# @elastic/ecs-winston-format Changelog

## v1.3.1

- Fix types expression in ambient context error.
  ([#93](https://github.com/elastic/ecs-logging-nodejs/pull/93))

## v1.3.0

- TypeScript types. ([#88](https://github.com/elastic/ecs-logging-nodejs/pull/88))

## v1.1.0

- Fix a crash ([#58](https://github.com/elastic/ecs-logging-nodejs/issues/58))
  when using APM integration and logging a record with an "event" or
  "service" top-level field that isn't an object. The "fix" here is to
  silently discard that "event" or "service" field because a non-object
  conflicts with the ECS spec for those fields. (See
  [#68](https://github.com/elastic/ecs-logging-nodejs/issues/68) for a
  discussion of the general ECS type conflict issue.)

- Fix a crash ([#59](https://github.com/elastic/ecs-logging-nodejs/issues/59))
  when using `convertReqRes: true` and logging a `res` field that is not an
  HTTP response object.

- Add `apmIntegration: false` option to all ecs-logging formatters to
  enable explicitly disabling Elastic APM integration.
  ([#62](https://github.com/elastic/ecs-logging-nodejs/pull/62))

- Fix "elasticApm.isStarted is not a function" crash on startup.
  ([#60](https://github.com/elastic/ecs-logging-nodejs/issues/60))

## v1.0.0

- Update to @elastic/ecs-helpers@1.0.0: ecs.version is now "1.6.0",
  http.request.method is no longer lower-cased, improvements to HTTP
  serialization.

- Add error logging feature. By default if an Error instance is passed as the
  `err` meta field, then it will be converted to
  [ECS Error fields](https://www.elastic.co/guide/en/ecs/current/ecs-error.html),
  e.g.:


  ```js
  logger.info('oops', { err: new Error('boom') })
  ```

  yields:

  ```js
  {
    "@timestamp": "2021-01-26T17:25:07.983Z",
    "log.level": "info",
    "message": "oops",
    "ecs": {
      "version": "1.5.0"
    },
    "error": {
      "type": "Error",
      "message": "boom",
      "stack_trace": "Error: boom\n    at Object.<anonymous> (..."
    }
  }
  ```

  This special handling of the `err` meta field can be disabled via the
  `convertErr: false` formatter option.

- Set "service.name" and "event.dataset" log fields if Elastic APM is started.
  This helps to filter for different log streams in the same pod and the
  latter is required for log anomaly detection.
  ([#41](https://github.com/elastic/ecs-logging-nodejs/issues/41))

- Add support for [ECS tracing fields](https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html).
  If it is detected that [Elastic APM](https://www.npmjs.com/package/elastic-apm-node)
  is in use and there is an active trace, then tracing fields will be added to
  log records. This enables linking between traces and log records in Kibana.
  ([#35](https://github.com/elastic/ecs-logging-nodejs/issues/35))

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
  handled. ([#32](https://github.com/elastic/ecs-logging-nodejs/issues/32))

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
  [#23](https://github.com/elastic/ecs-logging-nodejs/pull/23)

## v0.2.0

- Use the version number provided by ecs-helpers - [#13](https://github.com/elastic/ecs-logging-nodejs/pull/13)

## v0.1.0

Initial release.
