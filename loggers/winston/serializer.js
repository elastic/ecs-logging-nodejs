'use strict'

const build = require('fast-json-stringify')

const string = { type: 'string' }
const number = { type: 'number' }

const stringify = build({
  type: 'object',
  additionalProperties: true,
  properties: {
    log: {
      type: 'object',
      properties: {
        level: string,
        logger: string
      }
    },
    ecs: {
      type: 'object',
      properties: {
        version: string
      }
    },
    '@timestamp': string,
    message: string,
    event: {
      type: 'object',
      properties: {
        id: string
      }
    },
    http: {
      type: 'object',
      properties: {
        request: {
          type: 'object',
          properties: {
            method: string,
            headers: {
              type: 'object',
              additionalProperties: true
            },
            body: {
              type: 'object',
              properties: {
                bytes: number
              }
            }
          }
        },
        response: {
          type: 'object',
          properties: {
            status_code: number,
            headers: {
              type: 'object',
              additionalProperties: true
            },
            body: {
              type: 'object',
              properties: {
                bytes: number
              }
            }
          }
        }
      }
    },
    url: {
      type: 'object',
      properties: {
        path: string,
        domain: string,
        port: number
      }
    },
    client: {
      type: 'object',
      properties: {
        address: string,
        port: number
      }
    },
    user_agent: {
      type: 'object',
      properties: {
        original: string
      }
    }
  }
})

module.exports = stringify
