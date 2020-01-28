'use strict'

const app = require('express')()
const morgan = require('morgan')
const ecsFormat = require('./')()

app.use(morgan(ecsFormat))

app.get('/', function (req, res) {
  res.send('hello, world!')
})

app.listen(3000, () => {
  console.log('Listening')
})
