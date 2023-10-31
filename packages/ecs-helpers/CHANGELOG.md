# @elastic/ecs-helpers Changelog

## v2.1.1

- fix: Use `req.originalUrl`, if available, when converting `req` to ECS fields.
  This is necessary because [Express will mutate req.url during routing](https://expressjs.com/en/4x/api.html#req.originalUrl).
  (https://github.com/elastic/ecs-logging-nodejs/issues/114)

## v2.1.0

- Bump the `ecs.version` from "1.6.0" to "8.10.0".
  (https://github.com/elastic/ecs-logging-nodejs/issues/133)

- `formatHttpRequest()` will now attempt to determine request ID and add it
  to the [`http.request.id` field](https://www.elastic.co/guide/en/ecs/current/ecs-http.html#field-http-request-id).
  This first attempts `req.id` (Fastify, express-request-id), `req.id()`
  (Restify), and then falls back to the `request-id` or `x-request-id` headers.
  (https://github.com/elastic/ecs-logging-nodejs/issues/76)

  Note: In previous versions a `req.id` value would be added to the `event.id`
  field. This has been removed. Please [open an issue](https://github.com/elastic/ecs-logging-nodejs/issues/new)
  if this impacts you.


## v2.0.0

- [Breaking change.] Drop the `serialize` method. Serialization will move to
  the individual `@elastic/ecs-*-format` libraries -- and they will be
  switching to the `safe-stable-stringify` package.

## v1.1.0

- Fix `formatHttpRequest` and `formatHttpResponse` to be more defensive. If
  the given request or response object, respectively, is not one they know
  how to process (for example if a user logs a `req` or `res` field that
  is not a Node.js http request or response object), then processing is skipped.
  The functions now return true if the given object could be processed,
  false otherwise. `formatError` was similarly changed to return true/false for
  whether the given `err` could be processed.

## v1.0.0

- Change `formatHttpRequest` and `formatHttpResponse` to no longer exclude
  the "content-length" and "user-agent" headers for "http.request.headers"
  and "http.response.headers", even though their info also rendered to
  other specialized fields.
- Update ECS version to "1.6.0". Relevant [ECS changes](https://github.com/elastic/ecs/blob/master/CHANGELOG.md#160):
  - "span.id" - This field is included by the loggers when integrating with APM.
  - "Deprecate guidance to lowercase http.request.method."
    Now when using `formatHttpRequest` the "http.request.method" field will no
    longer be lowercased.
- Fix possible crash in `formatHttpRequest` if `req.socket` is not available.
  ([#17](https://github.com/elastic/ecs-logging-nodejs/issues/17))
- Add support for the hapi request object being passed to `formatHttpRequest`
  and `formatHttpResponse`.
- Fix the setting of the remote IP and port
  [ECS client fields](https://www.elastic.co/guide/en/ecs/current/ecs-client.html):
  `client.address`, `client.ip`, `client.port`. This also supports using
  Express's `req.ip`.

## v0.6.0

- Add `formatError` for adding [ECS Error fields](https://www.elastic.co/guide/en/ecs/current/ecs-error.html)
  for a given `Error` object.
  ([#42](https://github.com/elastic/ecs-logging-nodejs/pull/42))

## v0.5.0

- Add [service.name](https://www.elastic.co/guide/en/ecs/current/ecs-service.html#field-service-name)
  and [event.dataset](https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-dataset)
  to the `stringify()` spec, according to the
  [ecs-logging spec](https://github.com/elastic/ecs-logging/blob/7fc00daf3da87e749b0053c592eca61a38afc6ce/spec/spec.json#L62-L87).
  These fields are automatically added by ECS loggers when APM is enabled.

## v0.4.0

- Add [ECS Tracing fields](https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html)
  to `stringify()` schema.

## v0.3.0

- Change `stringify()` to serialize "log.level" as a top-level dotted field
  per <https://github.com/elastic/ecs-logging/pull/33>.
  ([#27](https://github.com/elastic/ecs-logging-nodejs/pull/27))

## v0.2.1

- Fix `url.full` field - [#16](https://github.com/elastic/ecs-logging-nodejs/pull/16)

## v0.2.0

- Export ECS version - [#12](https://github.com/elastic/ecs-logging-nodejs/pull/12)

## v0.1.0

Initial release.
