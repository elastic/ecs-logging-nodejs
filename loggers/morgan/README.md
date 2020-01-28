# @elastic/morgan-ecs-format

A formatter for the [morgan](https://www.npmjs.com/package/morgan) logger compatible with [Elastic Common Schema](https://www.elastic.co/guide/en/ecs/current/index.html).

## Install
```sh
npm i @elastic/morgan-ecs-format
```

## Usage
```js
const app = require('express')()
const morgan = require('morgan')
const ecsFormat = require('@elastic/morgan-ecs-format')()

app.use(morgan(ecsFormat))

app.get('/', function (req, res) {
  res.send('hello, world!')
})

app.listen(3000, () => {
  console.log('Listening')
})

```

## License
[Apache 2.0](./LICENSE)
