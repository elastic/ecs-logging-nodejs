---
mapped_pages:
  - https://www.elastic.co/guide/en/ecs-logging/nodejs/current/winston.html
---

# ECS Logging with Winston [winston]

This Node.js package provides a formatter for the [winston](https://github.com/winstonjs/winston#readme) logger, compatible with [Elastic Common Schema (ECS) logging](ecs-logging://reference/intro.md). In combination with the [Filebeat](https://www.elastic.co/beats/filebeat) shipper, you can [monitor all your logs](https://www.elastic.co/log-monitoring) in one place in the Elastic Stack. `winston` 3.x versions >=3.3.3 are supported.


## Setup [_setup_2]


### Step 1: Install [winston-setup-step-1]

```cmd
$ npm install @elastic/ecs-winston-format
```


### Step 2: Configure [winston-setup-step-2]

```js
const winston = require('winston');
const { ecsFormat } = require('@elastic/ecs-winston-format');

const logger = winston.createLogger({
  format: ecsFormat(/* options */), <1>
  transports: [
    new winston.transports.Console()
  ]
});

logger.info('hi');
logger.error('oops there is a problem', { err: new Error('boom') });
```

1. Pass the ECS formatter to winston here.



### Step 3: Configure Filebeat [winston-setup-step-3]

The best way to collect the logs once they are ECS-formatted is with [Filebeat](beats://reference/filebeat/filebeat-overview.md):

:::::::{tab-set}

::::::{tab-item} Log file
1. Follow the [Filebeat quick start](beats://reference/filebeat/filebeat-installation-configuration.md)
2. Add the following configuration to your `filebeat.yaml` file.

For Filebeat 7.16+

```yaml
filebeat.inputs:
- type: filestream <1>
  paths: /path/to/logs.json
  parsers:
    - ndjson:
      overwrite_keys: true <2>
      add_error_key: true <3>
      expand_keys: true <4>

processors: <5>
  - add_host_metadata: ~
  - add_cloud_metadata: ~
  - add_docker_metadata: ~
  - add_kubernetes_metadata: ~
```

1. Use the filestream input to read lines from active log files.
2. Values from the decoded JSON object overwrite the fields that {{filebeat}} normally adds (type, source, offset, etc.) in case of conflicts.
3. {{filebeat}} adds an "error.message" and "error.type: json" key in case of JSON unmarshalling errors.
4. {{filebeat}} will recursively de-dot keys in the decoded JSON, and expand them into a hierarchical object structure.
5. Processors enhance your data. See [processors](beats://reference/filebeat/filtering-enhancing-data.md) to learn more.


For Filebeat < 7.16

```yaml
filebeat.inputs:
- type: log
  paths: /path/to/logs.json
  json.keys_under_root: true
  json.overwrite_keys: true
  json.add_error_key: true
  json.expand_keys: true

processors:
- add_host_metadata: ~
- add_cloud_metadata: ~
- add_docker_metadata: ~
- add_kubernetes_metadata: ~
```
::::::

::::::{tab-item} Kubernetes
1. Make sure your application logs to stdout/stderr.
2. Follow the [Run Filebeat on Kubernetes](beats://reference/filebeat/running-on-kubernetes.md) guide.
3. Enable [hints-based autodiscover](beats://reference/filebeat/configuration-autodiscover-hints.md) (uncomment the corresponding section in `filebeat-kubernetes.yaml`).
4. Add these annotations to your pods that log using ECS loggers. This will make sure the logs are parsed appropriately.

```yaml
annotations:
  co.elastic.logs/json.overwrite_keys: true <1>
  co.elastic.logs/json.add_error_key: true <2>
  co.elastic.logs/json.expand_keys: true <3>
```

1. Values from the decoded JSON object overwrite the fields that {{filebeat}} normally adds (type, source, offset, etc.) in case of conflicts.
2. {{filebeat}} adds an "error.message" and "error.type: json" key in case of JSON unmarshalling errors.
3. {{filebeat}} will recursively de-dot keys in the decoded JSON, and expand them into a hierarchical object structure.
::::::

::::::{tab-item} Docker
1. Make sure your application logs to stdout/stderr.
2. Follow the [Run Filebeat on Docker](beats://reference/filebeat/running-on-docker.md) guide.
3. Enable [hints-based autodiscover](beats://reference/filebeat/configuration-autodiscover-hints.md).
4. Add these labels to your containers that log using ECS loggers. This will make sure the logs are parsed appropriately.

```yaml
labels:
  co.elastic.logs/json.overwrite_keys: true <1>
  co.elastic.logs/json.add_error_key: true <2>
  co.elastic.logs/json.expand_keys: true <3>
```

1. Values from the decoded JSON object overwrite the fields that {{filebeat}} normally adds (type, source, offset, etc.) in case of conflicts.
2. {{filebeat}} adds an "error.message" and "error.type: json" key in case of JSON unmarshalling errors.
3. {{filebeat}} will recursively de-dot keys in the decoded JSON, and expand them into a hierarchical object structure.
::::::

:::::::
For more information, see the [Filebeat reference](beats://reference/filebeat/configuring-howto-filebeat.md).

::::{note}
You might like to try out our tutorial using Node.js ECS logging with winston: [Ingest logs from a Node.js web application using Filebeat](docs-content://manage-data/ingest/ingesting-data-from-applications/ingest-logs-from-nodejs-web-application-using-filebeat.md).
::::



## Usage [winston-usage]

```js
const winston = require('winston');
const { ecsFormat } = require('@elastic/ecs-winston-format');

const logger = winston.createLogger({
  level: 'info',
  format: ecsFormat(/* options */), <1>
  transports: [
    new winston.transports.Console()
  ]
});

logger.info('hi');
logger.error('oops there is a problem', { foo: 'bar' });
```

1. See available options [below](#winston-ref).


Running this script (available [here](https://github.com/elastic/ecs-logging-nodejs/blob/main/packages/ecs-winston-format/examples/basic.js)) will produce log output similar to the following:

```cmd
% node examples/basic.js
{"@timestamp":"2023-10-14T02:14:17.302Z","log.level":"info","message":"hi","ecs.version":"8.10.0"}
{"@timestamp":"2023-10-14T02:14:17.304Z","log.level":"error","message":"oops there is a problem","ecs.version":"8.10.0","foo":"bar"}
```

The formatter handles serialization to JSON, so you don’t need to add the [json](https://github.com/winstonjs/logform#json) formatter. As well, a timestamp is automatically generated by the formatter, so you don’t need to add the [timestamp](https://github.com/winstonjs/logform#timestamp) formatter.


## Error logging [winston-error-logging]

By default, the formatter will convert an `err` meta field that is an Error instance to [ECS Error fields](ecs://reference/ecs-error.md). For [example](https://github.com/elastic/ecs-logging-nodejs/blob/main/packages/ecs-winston-format/examples/error.js):

```js
const winston = require('winston');
const { ecsFormat } = require('@elastic/ecs-winston-format');
const logger = winston.createLogger({
  format: ecsFormat(),
  transports: [
    new winston.transports.Console()
  ]
});

const myErr = new Error('boom');
logger.info('oops', { err: myErr });
```

will yield (pretty-printed for readability):

```cmd
% node examples/error.js | jq .
{
  "@timestamp": "2021-01-26T17:25:07.983Z",
  "log.level": "info",
  "message": "oops",
  "error": {
    "type": "Error",
    "message": "boom",
    "stack_trace": "Error: boom\n    at Object.<anonymous> (..."
  },
  "ecs.version": "8.10.0"
}
```

Special handling of the `err` meta field can be disabled via the `convertErr: false` option:

```js
...
const logger = winston.createLogger({
  format: ecsFormat({ convertErr: false }),
...
```


## HTTP Request and Response Logging [winston-http-logging]

With the `convertReqRes: true` option, the formatter will automatically convert Node.js core [request](https://nodejs.org/api/http.md#http_class_http_incomingmessage) and [response](https://nodejs.org/api/http.md#http_class_http_serverresponse) objects when passed as the `req` and `res` meta fields, respectively.

```js
const http = require('http');
const winston = require('winston');
const { ecsFormat } = require('@elastic/ecs-winston-format');

const logger = winston.createLogger({
  level: 'info',
  format: ecsFormat({ convertReqRes: true }), <1>
  transports: [
    new winston.transports.Console()
  ]
});

const server = http.createServer(handler);
server.listen(3000, () => {
  logger.info('listening at http://localhost:3000')
});

function handler (req, res) {
  res.setHeader('Foo', 'Bar');
  res.end('ok');
  logger.info('handled request', { req, res }); <2>
}
```

1. use `convertReqRes` option
2. log `req` and/or `res` meta fields


This will produce logs with request and response info using [ECS HTTP fields](ecs://reference/ecs-http.md). For [example](https://github.com/elastic/ecs-logging-nodejs/blob/main/packages/ecs-winston-format/examples/http.js):

```cmd
% node examples/http.js | jq .    # using jq for pretty printing
...                               # run 'curl http://localhost:3000/'
{
  "@timestamp": "2023-10-14T02:15:54.768Z",
  "log.level": "info",
  "message": "handled request",
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
        "foo": "Bar"
      }
    }
  },
  "url": {
    "path": "/",
    "full": "http://localhost:3000/"
  },
  "client": {
    "address": "::ffff:127.0.0.1",
    "ip": "::ffff:127.0.0.1",
    "port": 49538
  },
  "user_agent": {
    "original": "curl/8.1.2"
  },
  "ecs.version": "8.10.0"
}
```


## Log Correlation with APM [winston-apm]

This ECS log formatter integrates with [Elastic APM](https://www.elastic.co/apm). If your Node app is using the [Node.js Elastic APM Agent](apm-agent-nodejs://reference/index.md), then a number of fields are added to log records to correlate between APM services or traces and logging data:

* Log statements (e.g. `logger.info(...)`) called when there is a current tracing span will include [tracing fields](ecs://reference/ecs-tracing.md) — `trace.id`, `transaction.id`, `span.id`.
* A number of service identifier fields determined by or configured on the APM agent allow cross-linking between services and logs in Kibana — `service.name`, `service.version`, `service.environment`, `service.node.name`.
* `event.dataset` enables [log rate anomaly detection](docs-content://solutions/observability/logs/inspect-log-anomalies.md) in the Elastic Observability app.

For example, running [examples/http-with-elastic-apm.js](https://github.com/elastic/ecs-logging-nodejs/blob/main/packages/ecs-winston-format/examples/http-with-elastic-apm.js) and `curl -i localhost:3000/` results in a log record with the following:

```cmd
% node examples/http-with-elastic-apm.js | jq .
...
  "service.name": "http-with-elastic-apm",
  "service.version": "1.4.0",
  "service.environment": "development",
  "event.dataset": "http-with-elastic-apm"
  "trace.id": "7fd75f0f33ff49aba85d060b46dcad7e",
  "transaction.id": "6c97c7c1b468fa05"
}
```

These IDs match trace data reported by the APM agent.

Integration with Elastic APM can be explicitly disabled via the `apmIntegration: false` option, for example:

```js
const logger = winston.createLogger({
  format: ecsFormat({ apmIntegration: false }),
  // ...
})
```


## Limitations and Considerations [winston-limitations]

The [ecs-logging spec](https://github.com/elastic/ecs-logging/tree/main/spec) suggests that the first three fields in log records should be `@timestamp`, `log.level`, and `message`. As of version 1.5.0, this formatter does **not** follow this suggestion. It would be possible but would require creating a new Object in `ecsFields` for each log record. Given that ordering of ecs-logging fields is for **human readability** and does not affect interoperability, the decision was made to prefer performance.


## Reference [winston-ref]


### `ecsFormat([options])` [winston-ref-ecsFormat]

* `options` `{type-object}` The following options are supported:

    * `convertErr` `{type-boolean}` Whether to convert a logged `err` field to ECS error fields. **Default:** `true`.
    * `convertReqRes` `{type-boolean}` Whether to logged `req` and `res` HTTP request and response fields to ECS HTTP, User agent, and URL fields. **Default:** `false`.
    * `apmIntegration` `{type-boolean}` Whether to enable APM agent integration. **Default:** `true`.
    * `serviceName` `{type-string}` A "service.name" value. If specified this overrides any value from an active APM agent.
    * `serviceVersion` `{type-string}` A "service.version" value. If specified this overrides any value from an active APM agent.
    * `serviceEnvironment` `{type-string}` A "service.environment" value. If specified this overrides any value from an active APM agent.
    * `serviceNodeName` `{type-string}` A "service.node.name" value. If specified this overrides any value from an active APM agent.
    * `eventDataset` `{type-string}` A "event.dataset" value. If specified this overrides the default of using `${serviceVersion}`.


Create a formatter for winston that emits in ECS Logging format. This is a single format that handles both [`ecsFields([options])`](#winston-ref-ecsFields) and [`ecsStringify([options])`](#winston-ref-ecsStringify). The following two are equivalent:

```js
const { ecsFormat, ecsFields, ecsStringify } = require('@elastic/ecs-winston-format');
const winston = require('winston');

const logger = winston.createLogger({
  format: ecsFormat(/* options */),
  // ...
});

const logger = winston.createLogger({
  format: winston.format.combine(
    ecsFields(/* options */),
    ecsStringify()
  ),
  // ...
});
```


### `ecsFields([options])` [winston-ref-ecsFields]

* `options` `{type-object}` The following options are supported:

    * `convertErr` `{type-boolean}` Whether to convert a logged `err` field to ECS error fields. **Default:** `true`.
    * `convertReqRes` `{type-boolean}` Whether to logged `req` and `res` HTTP request and response fields to ECS HTTP, User agent, and URL fields. **Default:** `false`.
    * `apmIntegration` `{type-boolean}` Whether to enable APM agent integration. **Default:** `true`.
    * `serviceName` `{type-string}` A "service.name" value. If specified this overrides any value from an active APM agent.
    * `serviceVersion` `{type-string}` A "service.version" value. If specified this overrides any value from an active APM agent.
    * `serviceEnvironment` `{type-string}` A "service.environment" value. If specified this overrides any value from an active APM agent.
    * `serviceNodeName` `{type-string}` A "service.node.name" value. If specified this overrides any value from an active APM agent.
    * `eventDataset` `{type-string}` A "event.dataset" value. If specified this overrides the default of using `${serviceVersion}`.


Create a formatter for winston that converts fields on the log record info object to ECS Logging format.


### `ecsStringify([options])` [winston-ref-ecsStringify]

Create a formatter for winston that stringifies/serializes the log record to JSON.

This is similar to `logform.json()`. They both use the `safe-stable-stringify` package to produce the JSON. Some differences:

* This stringifier skips serializing the `level` field, because it is not an ECS field.
* Winston provides a `replacer` that converts bigints to strings The argument **for** doing so is that a **JavaScript** JSON parser looses precision when parsing a bigint. The argument against is that a BigInt changes type to a string rather than a number. For now this stringifier does not convert BitInts to strings.

