# @elastic/ecs-morgan-format Changelog

## v1.5.1

- Fix types -- "index.d.ts" had not been included in the published package.
  (by @imusvesh in https://github.com/elastic/ecs-logging-nodejs/pull/170)

## v1.5.0

- Switch to `safe-stable-stringify` for JSON serialization. This library
  protects against circular references and bigints.
  (https://github.com/elastic/ecs-logging-nodejs/pull/155)

- Set `http.request.id` field (see [ecs-helpers CHANGELOG](../ecs-helpers/CHANGELOG.md#v210)).

- Changed to a named export. The preferred way to import is now:

  ```js
  const { ecsFormat } = require('@elastic/ecs-morgan-format'); // CommonJS
  import { ecsFormat } from '@elastic/ecs-morgan-format'; // ESM
  ```

  The old way will be deprecated and removed in the future:

  ```js
  const ecsFormat = require('@elastic/ecs-morgan-format'); // OLD
  ```

- Add support for default import in TypeScript, with or without the
  `esModuleInterop` setting:

  ```ts
  import ecsFormat from '@elastic/ecs-pino-format';
  ```

  However, note that using *named* imports is now preferred.

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

## v1.1.0

- Update @elastic/ecs-helpers@1.1.0 to get more robust HTTP req and res
  formatting.

- Add `apmIntegration: false` option to all ecs-logging formatters to
  enable explicitly disabling Elastic APM integration.
  ([#62](https://github.com/elastic/ecs-logging-nodejs/pull/62))

- Fix "elasticApm.isStarted is not a function" crash on startup.
  ([#60](https://github.com/elastic/ecs-logging-nodejs/issues/60))

## v1.0.0

- Update to @elastic/ecs-helpers@1.0.0: ecs.version is now "1.6.0",
  http.request.method is no longer lower-cased, improvements to HTTP
  serialization.

- Set "service.name" and "event.dataset" log fields if Elastic APM is started.
  This helps to filter for different log streams in the same pod and the
  latter is required for log anomaly detection.
  ([#41](https://github.com/elastic/ecs-logging-nodejs/issues/41))

- Add support for [ECS tracing fields](https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html).
  If it is detected that [Elastic APM](https://www.npmjs.com/package/elastic-apm-node)
  is in use and there is an active trace, then tracing fields will be added to
  log records. This enables linking between traces and log records in Kibana.
  ([#35](https://github.com/elastic/ecs-logging-nodejs/issues/35))

- Fix passing of a format *name*, e.g. `app.use(morgan(ecsFormat('tiny')))`.

## v0.3.0

- Serialize "log.level" as a top-level dotted field per
  https://github.com/elastic/ecs-logging/pull/33.
  [#23](https://github.com/elastic/ecs-logging-nodejs/pull/23)

## v0.2.0

- Use the version number provided by ecs-helpers - [#13](https://github.com/elastic/ecs-logging-nodejs/pull/13)

## v0.1.0

Initial release.
