<img align="right" width="auto" height="auto" src="https://www.elastic.co/static-res/images/elastic-logo-200.png">

# @elastic/ecs-pino-format

[![Build Status](https://apm-ci.elastic.co/buildStatus/icon?job=apm-agent-nodejs%2Fecs-logging-js-mbp%2Fmaster)](https://apm-ci.elastic.co/job/apm-agent-nodejs/job/ecs-logging-js-mbp/job/master/)  [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)

This Node.js package provides a formatter for the [pino](https://www.npmjs.com/package/pino)
logger compatible with [Elastic Common Schema (ECS) logging](https://www.elastic.co/guide/en/ecs/current/index.html).<br/>
In combination with the [filebeat](https://www.elastic.co/products/beats/filebeat)
shipper, you can send your logs directly to Elasticsearch and leverage
[Kibana's Logs UI](https://www.elastic.co/guide/en/infrastructure/guide/current/logs-ui-overview.html)
to inspect all logs in one single place.

---

**Please note** that this library is in **beta** and backwards-incompatible
changes might be introduced in releases during the "0.x" series.
A "1.0.0" version will be released when no longer in beta.

---

## Install

```sh
npm install @elastic/ecs-pino-format
```

## Usage

This package will configure Pino's `formatters`, `messageKey` and `timestamp` options.

```js
const ecsFormat = require('@elastic/ecs-pino-format')
const pino = require('pino')

const log = pino(ecsFormat())
log.info('Hello world')

const child = log.child({ module: 'foo' })
child.warn('From child')
```

Running this will produce log output similar to the following:

```sh
{"log.level":"info","@timestamp":"2021-01-19T22:51:12.142Z","ecs":{"version":"1.5.0"},"process":{"pid":82240},"host":{"hostname":"pink.local"},"message":"Hello world"}
{"log.level":"warn","@timestamp":"2021-01-19T22:51:12.143Z","ecs":{"version":"1.5.0"},"process":{"pid":82240},"host":{"hostname":"pink.local"},"module":"foo","message":"From child"}
```

### Error logging

By default, the formatter will convert an `err` field that is an Error instance
to [ECS Error fields](https://www.elastic.co/guide/en/ecs/current/ecs-error.html).
For example:

```js
const ecsFormat = require('@elastic/ecs-pino-format')
const pino = require('pino')
const log = pino(ecsFormat())

const myErr = new Error('boom')
log.info({ err: myErr }, 'oops')
```

will yield (pretty-printed for readability):

```sh
% node examples/error.js | jq .
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

This is analogous to and overrides
[Pino's default err serializer](https://getpino.io/#/docs/api?id=serializers-object).
Special handling of the `err` field can be disabled via the `convertErr: false` option:

```js
const log = pino(ecsFormat({ convertErr: false }))
```


### HTTP Request and Response Logging

With the `convertReqRes: true` option, the formatter will automatically
convert Node.js core [request](https://nodejs.org/api/http.html#http_class_http_incomingmessage)
and [response](https://nodejs.org/api/http.html#http_class_http_serverresponse)
objects when passed as the `req` and `res` meta fields, respectively.
(This option replaces the usage of `req` and `res` [Pino serializers]().)

```js
const http = require('http')
const ecsFormat = require('@elastic/ecs-pino-format')
const pino = require('pino')

const log = pino({ ...ecsFormat({ convertReqRes: true }) }) // <-- use convertReqRes option

const server = http.createServer(function handler (req, res) {
  res.setHeader('Foo', 'Bar')
  res.end('ok')
  log.info({ req, res }, 'handled request')
})

server.listen(3000, () => {
  log.info('listening at http://localhost:3000')
}
```

This will produce logs with request and response info using
[ECS HTTP fields](https://www.elastic.co/guide/en/ecs/current/ecs-http.html).
For example:

```sh
% node examples/http.js | jq .    # using jq for pretty printing
...                               # run 'curl http://localhost:3000/'
{
  "log.level": "info",
  "@timestamp": "2021-01-19T22:58:59.649Z",
  "ecs": {
    "version": "1.5.0"
  },
  "process": {
    "pid": 82670
  },
  "host": {
    "hostname": "pink.local"
  },
  "http": {
    "version": "1.1",
    "request": {
      "method": "get",
      "headers": {
        "host": "localhost:3000",
        "accept": "*/*"
      }
    },
    "response": {
      "status_code": 200,
      "headers": {
        "foo": "Bar"
      }
    }
  },
  "url": {
    "full": "http://localhost:3000/",
    "path": "/"
  },
  "user_agent": {
    "original": "curl/7.64.1"
  },
  "message": "handled request"
}
```

See [the examples](examples/) showing request and response logging
[with Express](examples/express-simple.js),
[with the pino-http middleware package](examples/express-with-pino-http.js),
etc.


### Integration with APM

This ECS log formatter integrates with [Elastic APM](https://www.elastic.co/apm).
If your Node app is using the [Node.js Elastic APM Agent](https://www.elastic.co/guide/en/apm/agent/nodejs/current/intro.html),
then fields are added to log records that [identify an active trace](https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html) and the configured service name
(["service.name"](https://www.elastic.co/guide/en/ecs/current/ecs-service.html#field-service-name) and
["event.dataset"](https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-dataset)).
These fields allow cross linking between traces and logs in Kibana and support
log anomaly detection.


## Limitations and Considerations

The [ecs-logging spec](https://github.com/elastic/ecs-logging/tree/master/spec)
suggests that the first three fields in log records must be `@timestamp`,
`log.level`, and `message`. Pino's hooks does not provide a mechanism to put
the `message` field near the front. Given that ordering of ecs-logging fields
is for *human readability* and does not affect interoperability, it is not a
significant concern that this package doesn't place the `message` field near the
front.

The hooks that Pino currently provides do enable this package to convert
fields passed to `<logger>.child({ ... })`. This means that even with the
`convertReqRes` option a call to `<logger>.child({ req })` will *not* convert
that `req` to ECS HTTP fields. This is a slight limitation for users of
[pino-http](https://github.com/pinojs/pino-http) which does pass `req` to
logger.child.


## License

This software is licensed under the [Apache 2 license](./LICENSE).
