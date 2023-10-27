# @elastic/ecs-winston-format Changelog

## Unreleased

- Add `ecsFields` and `ecsStringify` exports that are winston formatters
  that separate the gathering of ECS fields (`ecsFields`) and the
  stringification of a log record to an ecs-logging JSON object
  (`ecsStringify`). This allows for better composability using
  [`winston.format.combine`](https://github.com/winstonjs/logform#combine).

  The preferred way to import now changes to:

  ```js
  const { ecsFormat } = require('@elastic/ecs-winston-format'); // NEW
  ```

  The old way will be deprecated and removed in the future:

  ```js
  const ecsFormat = require('@elastic/ecs-winston-format'); // OLD
  ```

  Common usage will still use `ecsFormat` in the same way:

  ```js
  const { ecsFormat } = require('@elastic/ecs-winston-format');
  const log = winston.createLogger({
      format: ecsFormat(<options>),
      // ...
  ```

  However, one can use the separated formatters as follows:

  ```js
  const { ecsFields, ecsStringify } = require('@elastic/ecs-winston-format');
  const log = winston.createLogger({
      format: winston.format.combine(
          ecsFields(<options>),
          // Add a custom formatter to redact fields here.
          ecsStringify()
      ),
      // ...
  ```

  One good use case is for redaction of sensitive fields in the log record
  as in https://github.com/elastic/ecs-logging-nodejs/issues/57. See a
  complete example at [examples/redact-fields.js](./examples/redact-fields.js).

- Fix/improve serialization of error details to `error.*` fields for the
  various ways a Winston logger handles `Error` instances.

    ```js
    const aCause = new Error('the cause');
    const anErr = new Error('boom', {cause: aCause});
    anErr.code = 42;

    log.debug("some message", anErr); // Form 1
    log.info(anErr, {foo: "bar"}); // Form 2
    log.warn("some message", {err: anErr, foo: "bar"}); // Form 3
    ```

  1. Winston will add a `stack` field for an error passed this way.
  2. If the `logform.errors(...)` format is configured, Winston will serialize
     `anErr` passed this way.
  3. Passing an error via the `err` meta field is specific to
     `@elastic/ecs-winston-format` and is discouraged. If possible, use style 1.
     It will remain for now for backward compatibility.

  With this change, all three cases above will result in `anErr` details being
  serialized to [ECS `error.*` fields](https://www.elastic.co/guide/en/ecs/current/ecs-error.html),
  as well as [`error.cause`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause)
  and other properties on the error instance. Forms 2 and 3 are enabled via
  the `convertErr: true` configuration option.
  See [examples/basic.js](./examples/basic.js).

  In addition, if your Winston logger is configured to handle `uncaughtException`
  and/or `unhandledRejection` (https://github.com/winstonjs/winston#exceptions),
  then the Error instance included in this log record will be serialized to
  `error.*` fields. See [test/uncaught-exception.js](./test/uncaught-exception.js)
  and [test/unhandled-rejection.js](./test/unhandled-rejection.js) for examples.
  (https://github.com/elastic/ecs-logging-nodejs/issues/128)

- Switch to `safe-stable-stringify` for JSON serialization. This library
  protects against circular references and bigints.
  (https://github.com/elastic/ecs-logging-nodejs/pull/155)

- Explicitly depend on `triple-beam` (`>=1.1.0` when `MESSAGE` was added).
  Before this change, this package was assuming that it would be installed by
  the user. This worked for npm's flat install -- `npm install winston` will
  install a `node_modules/triple-beam/...` -- but not for Yarn 2's PnP install
  mechanism.
  (https://github.com/elastic/ecs-logging-nodejs/issues/108)

- Set `http.request.id` field (see [ecs-helpers CHANGELOG](../ecs-helpers/CHANGELOG.md#v210)).

## v1.4.0

- Add `service.version`, `service.environment`, and `service.node.name` log
  correlation fields, automatically inferred from an active APM agent. As
  well, the following `ecsFormat` configuration options have been added for
  overriding these and existing correlation fields: `serviceName`,
  `serviceVersion`, `serviceEnvironment`, `serviceNodeName`.
  (https://github.com/elastic/apm-agent-nodejs/issues/3195,
  https://github.com/elastic/ecs-logging-nodejs/issues/121,
  https://github.com/elastic/ecs-logging-nodejs/issues/87)

- Change to adding dotted field names (`"ecs.version": "1.6.0"`), rather than
  namespaced fields (`"ecs": {"version": "1.6.0"}`) for most fields. This is
  supported by the ecs-logging spec, and arguably preferred in the ECS logging
  docs. It is also what the ecs-logging-java libraries do. The resulting output
  is slightly shorter, and accidental collisions with user fields is less
  likely.

- Stop adding ".log" suffix to `event.dataset` field.
  ([#95](https://github.com/elastic/ecs-logging-nodejs/issues/95))

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
