# @elastic/ecs-pino-format Changelog

## Unreleased

- Add error logging feature. By default if an Error instance is passed as the
  `err` field, then it will be converted to
  [ECS Error fields](https://www.elastic.co/guide/en/ecs/current/ecs-error.html),
  e.g.:


  ```js
  log.info({ err: new Error('boom') }, 'oops')
  ```

  yields:

  ```js
  {
    "log.level": "info",
    "@timestamp": "2021-01-26T17:02:23.697Z",
    ...
    "error": {
      "type": "Error",
      "message": "boom",
      "stack_trace": "Error: boom\n    at Object.<anonymous> (..."
    },
    "message": "oops"
  }
  ```

  This special handling of the `err` field can be disabled via the
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

- BREAKING CHANGE: Conversion of HTTP request and response objects is no longer
  done by default. One must use the new `convertReqRes: true` formatter option.
  As well, only the meta keys `req` and `res` will be handled. Before this
  change the meta keys `req`, `res`, `request`, and `response` would all be
  handled. ([#32](https://github.com/elastic/ecs-logging-nodejs/issues/32))

  Before (no longer works):

  ```
  const log = pino({ ...ecsFormat() })

  http.createServer(function handler (request, response) {
    // ...
    log.info({ request, response }, 'handled request')
  })
  ```

  After:

  ```
  const log = pino({ ...ecsFormat({ convertReqRes: true }) }) // <-- specify convertReqRes option

  http.createServer(function handler (req, res) {
    // ...
    log.info({ req, res }, 'handled request') // <-- only `req` and `res` are special
  })
  ```

## v0.2.0

- Serialize "log.level" as a top-level dotted field per
  https://github.com/elastic/ecs-logging/pull/33 and
  set ["log.logger"](https://www.elastic.co/guide/en/ecs/current/ecs-log.html#field-log-logger)
  to the logger ["name"](https://getpino.io/#/docs/api?id=name-string) if given.
  ([#23](https://github.com/elastic/ecs-logging-nodejs/pull/23))

## v0.1.0

Initial release.
