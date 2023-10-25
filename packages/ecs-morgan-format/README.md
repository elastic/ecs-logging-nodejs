<img align="right" width="auto" height="auto" src="https://www.elastic.co/static-res/images/elastic-logo-200.png">

# @elastic/ecs-morgan-format

[![npm](https://img.shields.io/npm/v/@elastic/ecs-morgan-format.svg)](https://www.npmjs.com/package/@elastic/ecs-morgan-format)
[![test](https://github.com/elastic/ecs-logging-nodejs/actions/workflows/test.yml/badge.svg)](https://github.com/elastic/ecs-logging-nodejs/actions/workflows/test.yml)

This Node.js package provides a formatter for the
[morgan](https://github.com/expressjs/morgan) logging middleware compatible with
[Elastic Common Schema (ECS) logging](https://www.elastic.co/guide/en/ecs-logging/overview/master/intro.html).
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

app.use(morgan(ecsFormat(/* options */)))

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
  "@timestamp": "2023-10-16T22:00:33.782Z",
  "log.level": "info",
  "message": "::ffff:127.0.0.1 - - [16/Oct/2023:22:00:33 +0000] \"GET / HTTP/1.1\" 200 13 \"-\" \"curl/8.1.2\"",
  "http": {
    "version": "1.1",
    "request": {
      "method": "GET",
      "headers": {
        "host": "localhost:3000",
        "user-agent": "curl/8.1.2",
        "accept": "*/*"
      }
    },
    "response": {
      "status_code": 200,
      "headers": {
        "x-powered-by": "Express",
        "content-type": "text/html; charset=utf-8",
        "content-length": "13",
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
  "client": {
    "address": "::ffff:127.0.0.1",
    "ip": "::ffff:127.0.0.1",
    "port": 60455
  },
  "user_agent": {
    "original": "curl/8.1.2"
  },
  "ecs.version": "1.6.0"
}
```

Please see the [Node.js ECS morgan documentation](https://www.elastic.co/guide/en/ecs-logging/nodejs/current/morgan.html) for more.

## License

This software is licensed under the [Apache 2 license](./LICENSE).
