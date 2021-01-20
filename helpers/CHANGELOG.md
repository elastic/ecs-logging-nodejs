# @elastic/ecs-helpers Changelog

## Unreleased

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
