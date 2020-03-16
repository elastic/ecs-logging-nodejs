<img align="right" width="auto" height="auto" src="https://www.elastic.co/static-res/images/elastic-logo-200.png">

# @elastic/ecs-pino-format

[![Build Status](https://apm-ci.elastic.co/buildStatus/icon?job=apm-agent-nodejs%2Fecs-logging-js-mbp%2Fmaster)](https://apm-ci.elastic.co/job/apm-agent-nodejs/job/ecs-logging-js-mbp/job/master/)  [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)

A formatter for the [pino](https://www.npmjs.com/package/pino) logger compatible with [Elastic Common Schema](https://www.elastic.co/guide/en/ecs/current/index.html).<br/>
In combination with [filebeat](https://www.elastic.co/products/beats/filebeat) you can send your logs directly to Elasticsearch and leverage [Kibana's Logs UI](https://www.elastic.co/guide/en/infrastructure/guide/current/logs-ui-overview.html) to inspect all logs in one single place.

## Install
```sh
npm i @elastic/ecs-pino-format
```

## Usage
This package will configure the Pino's `formatters`, `messageKey` and `timestamp` options.

```js
'use strict'

const http = require('http')
const ecsFormat = require('@elastic/ecs-pino-format')()
const pino = require('pino')({ ...ecsFormat })

const server = http.createServer(handler)
server.listen(3000, () => {
  console.log('Listening')
})

function handler (req, res) {
  pino.info({ req, res }, 'incoming request')
  res.end('ok')
}
```

## License
This software is licensed under the [Apache 2 license](./LICENSE).
