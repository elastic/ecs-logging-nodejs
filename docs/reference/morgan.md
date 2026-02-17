---
applies_to:
  stack: ga
  serverless: ga
mapped_pages:
  - https://www.elastic.co/guide/en/ecs-logging/nodejs/current/morgan.html
---

# ECS Logging with Morgan [morgan]

This Node.js package provides a formatter for the [morgan](https://github.com/expressjs/morgan#readme) logging middleware — commonly used with Express — compatible with [Elastic Common Schema (ECS) logging](ecs-logging://reference/intro.md). In combination with the [Filebeat](https://www.elastic.co/beats/filebeat) shipper, you can [monitor all your logs](https://www.elastic.co/log-monitoring) in one place in the Elastic Stack.


## Setup [_setup_3]

### Step 1: Install [morgan-setup-step-1]

```cmd
$ npm install @elastic/ecs-morgan-format
```


### Step 2: Configure [morgan-setup-step-2]

```js
const app = require('express')();
const morgan = require('morgan');
const { ecsFormat } = require('@elastic/ecs-morgan-format');

app.use(morgan(ecsFormat(/* options */))); <1>

// ...
app.get('/', function (req, res) {
  res.send('hello, world!');
})
app.listen(3000);
```

1. Pass the ECS formatter to `morgan()`.



### Step 3: Configure Filebeat [morgan-setup-step-3]

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


## Usage [morgan-usage]

```js
const app = require('express')();
const morgan = require('morgan');
const { ecsFormat } = require('@elastic/ecs-morgan-format');

app.use(morgan(ecsFormat(/* options */))); <1>

app.get('/', function (req, res) {
  res.send('hello, world!');
})
app.get('/error', function (req, res, next) {
  next(new Error('boom'));
})

app.listen(3000)
```

1. See available options [below](#morgan-ref).


Running this script (the full example is [here](https://github.com/elastic/ecs-logging-nodejs/blob/main/packages/ecs-morgan-format/examples/express.js)) and making a request (via `curl -i localhost:3000/`) will produce log output similar to the following:

```cmd
% node examples/express.js | jq .  # piping to jq for pretty-printing
{
  "@timestamp": "2021-01-16T00:03:23.279Z",
  "log.level": "info",
  "message": "::1 - - [16/Jan/2021:00:03:23 +0000] \"GET / HTTP/1.1\" 200 13 \"-\" \"curl/7.64.1\"",
  "ecs.version": "8.10.0",
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


## Format options [morgan-format-options]

You can pass any [`format` argument](https://github.com/expressjs/morgan#morganformat-options) you would normally pass to `morgan()`, and the log "message" field will use the specified format. The default is [`combined`](https://github.com/expressjs/morgan#combined).

```js
const app = require('express')();
const morgan = require('morgan');
const { ecsFormat } = require('@elastic/ecs-morgan-format');

app.use(morgan(ecsFormat({ format: 'tiny' }))); <1>
// ...
```

1. If "format" is the only option you are using, you may pass it as `ecsFormat('tiny')`.



## log.level [morgan-log-level]

The `log.level` field will be "error" for response codes >= 500, otherwise "info". For example, running  [examples/express.js](https://github.com/elastic/ecs-logging-nodejs/blob/main/packages/ecs-morgan-format/examples/express.js) again, a `curl -i localhost:3000/error` will yield:

```cmd
% node examples/express.js | jq .
{
  "@timestamp": "2021-01-18T17:52:12.810Z",
  "log.level": "error",
  "message": "::1 - - [18/Jan/2021:17:52:12 +0000] \"GET /error HTTP/1.1\" 500 1416 \"-\" \"curl/7.64.1\"",
  "http": {
    "response": {
      "status_code": 500,
  ...
```


## Log correlation with APM [morgan-apm]

This ECS log formatter integrates with [Elastic APM](https://www.elastic.co/apm). If your Node app is using the [Node.js Elastic APM Agent](apm-agent-nodejs://reference/index.md), then a number of fields are added to log records to correlate between APM services or traces and logging data:

* Log statements (e.g. `logger.info(...)`) called when there is a current tracing span will include [tracing fields](ecs://reference/ecs-tracing.md) — `trace.id`, `transaction.id`.
* A number of service identifier fields determined by or configured on the APM agent allow cross-linking between services and logs in Kibana — `service.name`, `service.version`, `service.environment`, `service.node.name`.
* `event.dataset` enables [log rate anomaly detection](docs-content://solutions/observability/logs/inspect-log-anomalies.md) in the Elastic Observability app.

For example, running [examples/express-with-apm.js](https://github.com/elastic/ecs-logging-nodejs/blob/main/packages/ecs-morgan-format/examples/express-with-apm.js) and `curl -i localhost:3000/` results in a log record with the following:

```cmd
% node examples/express-with-apm.js | jq .
{
  // The same fields as before, plus:
  "service.name": "express-with-elastic-apm",
  "service.version": "1.1.0",
  "service.environment": "development",
  "event.dataset": "express-with-elastic-apm",
  "trace.id": "116d46f667a7600deed9c41fa015f7de",
  "transaction.id": "b84fb72d7bf42866"
}
```

These IDs match trace data reported by the APM agent.

Integration with Elastic APM can be explicitly disabled via the `apmIntegration: false` option, for example:

```js
app.use(morgan(ecsFormat({ apmIntegration: false })));
```


## Reference [morgan-ref]


### `ecsFormat([options])` [morgan-ref-ecsFormat]

* `options` `{type-object}` The following options are supported:

    * `format` `{type-string}` A format **name** (e.g. *combined*), format function (e.g. `morgan.combined`), or a format string (e.g. *:method :url :status*). This is used to format the "message" field. Defaults to `morgan.combined`.
    * `convertErr` `{type-boolean}` Whether to convert a logged `err` field to ECS error fields. **Default:** `true`.
    * `apmIntegration` `{type-boolean}` Whether to enable APM agent integration. **Default:** `true`.
    * `serviceName` `{type-string}` A "service.name" value. If specified this overrides any value from an active APM agent.
    * `serviceVersion` `{type-string}` A "service.version" value. If specified this overrides any value from an active APM agent.
    * `serviceEnvironment` `{type-string}` A "service.environment" value. If specified this overrides any value from an active APM agent.
    * `serviceNodeName` `{type-string}` A "service.node.name" value. If specified this overrides any value from an active APM agent.
    * `eventDataset` `{type-string}` A "event.dataset" value. If specified this overrides the default of using `${serviceVersion}`.


Create a formatter for morgan that emits in ECS Logging format.

