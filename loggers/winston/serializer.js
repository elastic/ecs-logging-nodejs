'use strict'

const build = require('fast-json-stringify')

const string = { type: 'string' }
const number = { type: 'number' }

const stringify = build({
  type: 'object',
  properties: {
    '@timestamp': string,
    log: {
      type: 'object',
      properties: {
        level: string,
        logger: string
      }
    },
    message: string,
    ecs: {
      type: 'object',
      properties: {
        version: string
      }
    },
    event: {
      type: 'object',
      properties: {
        id: string
      }
    },
    http: {
      type: 'object',
      properties: {
        version: string,
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
        port: number,
        query: string,
        fragment: string,
        full: string
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
  },
  additionalProperties: true
})

module.exports = stringify
