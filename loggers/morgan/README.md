<img align="right" width="auto" height="auto" src="https://www.elastic.co/static-res/images/elastic-logo-200.png">

# @elastic/ecs-morgan-format

[![Build Status](https://apm-ci.elastic.co/buildStatus/icon?job=apm-agent-nodejs%2Fecs-logging-js-mbp%2Fmaster)](https://apm-ci.elastic.co/job/apm-agent-nodejs/job/ecs-logging-js-mbp/job/master/)  [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)

A formatter for the [morgan](https://www.npmjs.com/package/morgan) logger compatible with [Elastic Common Schema](https://www.elastic.co/guide/en/ecs/current/index.html).<br/>
In combination with [filebeat](https://www.elastic.co/products/beats/filebeat) you can send your logs directly to Elasticsearch and leverage [Kibana's Logs UI](https://www.elastic.co/guide/en/infrastructure/guide/current/logs-ui-overview.html) to inspect all logs in one single place.

---

**Please note** that this library is in a **beta** version and backwards-incompatible changes might be introduced in future releases. While we strive to comply to [semver](https://semver.org/), we can not guarantee to avoid breaking changes in minor releases.

---

## Install
```sh
npm i @elastic/ecs-morgan-format
```

## Usage
```js
const app = require('express')()
const morgan = require('morgan')
const ecsFormat = require('@elastic/ecs-morgan-format')()

app.use(morgan(ecsFormat))

app.get('/', function (req, res) {
  res.send('hello, world!')
})

app.listen(3000, () => {
  console.log('Listening')
})
```

### Options
You can pass any [format option](https://github.com/expressjs/morgan#options) you would normally pass to `morgan`, and the log message will use the specified format *(the default is `combined`)*.
```js
const app = require('express')()
const morgan = require('morgan')
const ecsFormat = require('@elastic/ecs-morgan-format')('tiny')
app.use(morgan(ecsFormat))
```

## License
This software is licensed under the [Apache 2 license](./LICENSE).
