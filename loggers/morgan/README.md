<img align="right" width="auto" height="auto" src="https://www.elastic.co/static-res/images/elastic-logo-200.png">

# @elastic/ecs-morgan-format

[![Build Status](https://apm-ci.elastic.co/buildStatus/icon?job=apm-agent-nodejs%2Fecs-logging-js-mbp%2Fmaster)](https://apm-ci.elastic.co/job/apm-agent-nodejs/job/ecs-logging-js-mbp/job/master/)  [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)

This Node.js package provides a formatter for the
[morgan](https://www.npmjs.com/package/morgan) logging middleware compatible with
[Elastic Common Schema (ECS) logging](https://www.elastic.co/guide/en/ecs-logging/overview/master/intro.html).<br/>
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
npm install @elastic/ecs-morgan-format
```

## Usage

```js
const app = require('express')()
const morgan = require('morgan')
const ecsFormat = require('@elastic/ecs-morgan-format')

app.use(morgan(ecsFormat()))

app.get('/', function (req, res) {
  res.send('hello, world!')
})

app.listen(3000)
```

Running this script and making a request (via `curl -i localhost:3000/`) will
produce log output similar to the following:

```sh
% node examples/express.js | jq .  # piping to jq for pretty-printing
{
  "@timestamp": "2021-01-16T00:03:23.279Z",
  "log.level": "info",
  "message": "::1 - - [16/Jan/2021:00:03:23 +0000] \"GET / HTTP/1.1\" 200 13 \"-\" \"curl/7.64.1\"",
  "ecs": {
    "version": "1.5.0"
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
        "x-powered-by": "Express",
        "content-type": "text/html; charset=utf-8",
        "etag": "W/\"d-HwnTDHB9U/PRbFMN1z1wps51lqk\""
      },
      "body": {
        "bytes": 13
      }
    }
  },
  "url": {
    "path": "/",
    "domain": "localhost",
    "full": "http://localhost:3000/"
  },
  "user_agent": {
    "original": "curl/7.64.1"
  }
}
```

### Options

You can pass any [`format` argument](https://github.com/expressjs/morgan#morganformat-options)
you would normally pass to `morgan`, and the log message will use the
specified format *(the default is [`combined`](https://github.com/expressjs/morgan#combined))*.

```js
const app = require('express')()
const morgan = require('morgan')
const ecsFormat = require('@elastic/ecs-morgan-format')

app.use(morgan(ecsFormat('tiny')))
```

### log.level

The `log.level` field will be "error" for response codes >= 500, otherwise
"info".

Using "examples/expresss.js", a `curl -i localhost:3000/error` will yield:

```sh
% node examples/express.js | jq .
{
  "@timestamp": "2021-01-18T17:52:12.810Z",
  "log.level": "error",
  "message": "::1 - - [18/Jan/2021:17:52:12 +0000] \"GET /error HTTP/1.1\" 500 1416 \"-\" \"curl/7.64.1\"",
  "http": {
    "response": {
      "status_code": 500,
  ...
```


### Integration with APM

This ECS log formatter integrates with [Elastic APM](https://www.elastic.co/apm).
If your Node app is using the [Node.js Elastic APM Agent](https://www.elastic.co/guide/en/apm/agent/nodejs/current/intro.html),
then fields are added to log records that [identify an active trace](https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html) and the configured service name
(["service.name"](https://www.elastic.co/guide/en/ecs/current/ecs-service.html#field-service-name) and
["event.dataset"](https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-dataset)).
These fields allow cross linking between traces and logs in Kibana and support
log anomaly detection.


## License

This software is licensed under the [Apache 2 license](./LICENSE).
