<img align="right" width="auto" height="auto" src="https://www.elastic.co/static-res/images/elastic-logo-200.png">

# @elastic/ecs-morgan-format

[![Build Status](https://apm-ci.elastic.co/buildStatus/icon?job=apm-agent-nodejs%2Fecs-logging-nodejs-mbp%2Fmaster)](https://apm-ci.elastic.co/job/apm-agent-nodejs/job/ecs-logging-nodejs-mbp/job/master/)  [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)

This Node.js package provides a formatter for the
[morgan](https://www.npmjs.com/package/morgan) logging middleware compatible with
[Elastic Common Schema (ECS) logging](https://www.elastic.co/guide/en/ecs-logging/overview/master/intro.html).<br/>
In combination with the [filebeat](https://www.elastic.co/products/beats/filebeat)
shipper, you can send your logs directly to Elasticsearch and leverage
[Kibana's Logs app](https://www.elastic.co/guide/en/observability/current/monitor-logs.html)
to inspect all logs in one single place.

Please see the [Node.js ECS morgan documentation](https://www.elastic.co/guide/en/ecs-logging/nodejs/current/morgan.html).


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
    "version": "1.6.0"
  },
  "http": {
    "version": "1.1",
    "request": {
      "method": "GET",
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

Please see the [Node.js ECS morgan documentation](https://www.elastic.co/guide/en/ecs-logging/nodejs/current/morgan.html) for more.

## License

This software is licensed under the [Apache 2 license](./LICENSE).
