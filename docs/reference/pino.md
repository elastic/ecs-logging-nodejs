---
applies_to:
  stack: ga
  serverless: ga
mapped_pages:
  - https://www.elastic.co/guide/en/ecs-logging/nodejs/current/pino.html
---

# ECS Logging with Pino [pino]

This Node.js package provides a formatter for the [pino](https://getpino.io) logger, compatible with [Elastic Common Schema (ECS) logging](ecs-logging://reference/intro.md). In combination with the [Filebeat](https://www.elastic.co/beats/filebeat) shipper, you can [monitor all your logs](https://www.elastic.co/log-monitoring) in one place in the Elastic Stack. `pino` 6.x, 7.x, and 8.x versions are supported.


## Setup [_setup]


### Step 1: Install [pino-setup-step-1]

```cmd
$ npm install @elastic/ecs-pino-format
```


### Step 2: Configure [pino-setup-step-2]

```js
const { ecsFormat } = require('@elastic/ecs-pino-format');
const pino = require('pino');

const log = pino(ecsFormat(/* options */)); <1>
log.info('hi');
log.error({ err: new Error('boom') }, 'oops there is a problem');
// ...
```

1. This will [configure](https://getpino.io/#/docs/api?id=options) Pino's `formatters`, `messageKey` and `timestamp` options.


See usage discussion and examples below.


### Step 3: Configure Filebeat [pino-setup-step-3]

```{applies_to}
stack: ga
serverless: unavailable
```

The best way to collect the logs once they are ECS-formatted is with [Filebeat](beats://reference/filebeat/index.md):

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


## Usage [pino-usage]

```js
const { ecsFormat } = require('@elastic/ecs-pino-format');
const pino = require('pino');

const log = pino(ecsFormat(/* options */)); <1>
log.info('Hello world');

const child = log.child({ module: 'foo' });
child.warn('From child');
```

1. See available options [below](#pino-ref).


Running this will produce log output similar to the following:

```cmd
{"log.level":"info","@timestamp":"2023-10-14T02:07:47.901Z","process.pid":56645,"host.hostname":"pink.local","ecs.version":"8.10.0","message":"Hello world"}
{"log.level":"warn","@timestamp":"2023-10-14T02:07:47.901Z","process.pid":56645,"host.hostname":"pink.local","ecs.version":"8.10.0","module":"foo","message":"From child"}
```


## Error Logging [pino-error-logging]

By default, the formatter will convert an `err` field that is an Error instance to [ECS Error fields](ecs://reference/ecs-error.md). For example:

```js
const { ecsFormat } = require('@elastic/ecs-pino-format');
const pino = require('pino');
const log = pino(ecsFormat());

const myErr = new Error('boom');
log.info({ err: myErr }, 'oops');
```

will yield (pretty-printed for readability):

```cmd
% node examples/error.js | jq .
{
  "log.level": "info",
  "@timestamp": "2021-01-26T17:02:23.697Z",
  ...
  "error": {
    "type": "Error",
    "message": "boom",
    "stack_trace": "Error: boom\n    at Object.<anonymous> (..."
  },
  "message": "oops"
}
```

This is analogous to and overrides [Pino's default err serializer](https://getpino.io/#/docs/api?id=serializers-object). Special handling of the `err` field can be disabled via the `convertErr: false` option:

```js
const log = pino(ecsFormat({ convertErr: false }));
```


## HTTP Request and Response Logging [pino-http-logging]

With the `convertReqRes: true` option, the formatter will automatically convert Node.js core [request](https://nodejs.org/api/http.md#http_class_http_incomingmessage) and [response](https://nodejs.org/api/http.md#http_class_http_serverresponse) objects when passed as the `req` and `res` fields, respectively. (This option replaces the usage of `req` and `res` [Pino serializers](https://getpino.io/#/docs/api?id=pinostdserializers-object).)

```js
const http = require('http');
const { ecsFormat } = require('@elastic/ecs-pino-format');
const pino = require('pino');

const log = pino(ecsFormat({ convertReqRes: true })); <1>

const server = http.createServer(function handler (req, res) {
  res.setHeader('Foo', 'Bar');
  res.end('ok');
  log.info({ req, res }, 'handled request'); <2>
});

server.listen(3000, () => {
  log.info('listening at http://localhost:3000');
}
```

1. use `convertReqRes` option
2. log with `req` and/or `res` fields


This will produce logs with request and response info using [ECS HTTP fields](ecs://reference/ecs-http.md). For example:

```cmd
% node examples/http.js | jq .    # using jq for pretty printing
...                               # run 'curl http://localhost:3000/'
{
  "log.level": "info",
  "@timestamp": "2023-10-14T02:10:14.477Z",
  "process.pid": 56697,
  "host.hostname": "pink.local",
  "ecs.version": "8.10.0",
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
    "full": "http://localhost:3000/",
    "path": "/"
  },
  "client": {
    "address": "::ffff:127.0.0.1",
    "ip": "::ffff:127.0.0.1",
    "port": 49504
  },
  "user_agent": {
    "original": "curl/8.1.2"
  },
  "message": "handled request"
}
```

The [examples/ directory](https://github.com/elastic/ecs-logging-nodejs/tree/main/packages/ecs-pino-format/examples) shows sample programs using request and response logging: [with Express](https://github.com/elastic/ecs-logging-nodejs/tree/main/packages/ecs-pino-format/examples/express-simple.js), [with the pino-http middleware package](https://github.com/elastic/ecs-logging-nodejs/tree/main/packages/ecs-pino-format/examples/express-with-pino-http.js), etc.


## Log Correlation with APM [pino-apm]

This ECS log formatter integrates with [Elastic APM](https://www.elastic.co/apm). If your Node app is using the [Node.js Elastic APM Agent](apm-agent-nodejs://reference/index.md), then a number of fields are added to log records to correlate between APM services or traces and logging data:

* Log statements (e.g. `logger.info(...)`) called when there is a current tracing span will include [tracing fields](ecs://reference/ecs-tracing.md) — `trace.id`, `transaction.id`, `span.id`.
* A number of service identifier fields determined by or configured on the APM agent allow cross-linking between services and logs in Kibana — `service.name`, `service.version`, `service.environment`, `service.node.name`.
* `event.dataset` enables [log rate anomaly detection](docs-content://solutions/observability/logs/inspect-log-anomalies.md) in the Elastic Observability app.

For example, running [examples/http-with-elastic-apm.js](https://github.com/elastic/ecs-logging-nodejs/blob/main/packages/ecs-pino-format/examples/http-with-elastic-apm.js) and `curl -i localhost:3000/` results in a log record with the following:

```cmd
% node examples/http-with-elastic-apm.js | jq .
...
  "service.name": "http-with-elastic-apm",
  "service.version": "1.4.0",
  "service.environment": "development",
  "event.dataset": "http-with-elastic-apm",
  "trace.id": "9f338eae7211b7993b98929046aed21d",
  "transaction.id": "2afbef5642cc7a3f",
...
```

These IDs match trace data reported by the APM agent.

Integration with Elastic APM can be explicitly disabled via the `apmIntegration: false` option, for example:

```js
const log = pino(ecsFormat({ apmIntegration: false }));
```


## Limitations and Considerations [pino-considerations]

The [ecs-logging spec](https://github.com/elastic/ecs-logging/tree/main/spec) suggests that the first three fields in log records must be `@timestamp`, `log.level`, and `message`. Pino does not provide a mechanism to put the `message` field near the front. Given that ordering of ecs-logging fields is for **human readability** and does not affect interoperability, this is not considered a significant concern.

The hooks that Pino currently provides do not enable this package to convert fields passed to `<logger>.child({ ... })`. This means that, even with the `convertReqRes` option, a call to `<logger>.child({ req })` will **not** convert that `req` to ECS HTTP fields. This is a slight limitation for users of [pino-http](https://github.com/pinojs/pino-http) which does this.


## Reference [pino-ref]


### `ecsFormat([options])` [pino-ref-ecsFormat]

* `options` `{type-object}` The following options are supported:

    * `convertErr` `{type-boolean}` Whether to convert a logged `err` field to ECS error fields. **Default:** `true`.
    * `convertReqRes` `{type-boolean}` Whether to logged `req` and `res` HTTP request and response fields to ECS HTTP, User agent, and URL fields. **Default:** `false`.
    * `apmIntegration` `{type-boolean}` Whether to enable APM agent integration. **Default:** `true`.
    * `serviceName` `{type-string}` A "service.name" value. If specified this overrides any value from an active APM agent.
    * `serviceVersion` `{type-string}` A "service.version" value. If specified this overrides any value from an active APM agent.
    * `serviceEnvironment` `{type-string}` A "service.environment" value. If specified this overrides any value from an active APM agent.
    * `serviceNodeName` `{type-string}` A "service.node.name" value. If specified this overrides any value from an active APM agent.
    * `eventDataset` `{type-string}` A "event.dataset" value. If specified this overrides the default of using `${serviceVersion}`.


Create options for `pino(...)` that configures ECS Logging format output.

