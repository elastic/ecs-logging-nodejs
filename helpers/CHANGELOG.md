# @elastic/ecs-helpers Changelog

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
  ([#27](https://github.com/elastic/ecs-logging-js/pull/27))

## v0.2.1

- Fix `url.full` field - [#16](https://github.com/elastic/ecs-logging-js/pull/16)

## v0.2.0

- Export ECS version - [#12](https://github.com/elastic/ecs-logging-js/pull/12)

## v0.1.0

Initial release.
