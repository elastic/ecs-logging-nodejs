import { FormatFn } from "morgan";

interface Config {
  /**
   * A format *name* (e.g. 'combined'), format function (e.g. `morgan.combined`),
   * or a format string (e.g. ':method :url :status').
   *
   * This is used to format the "message" field.
   * @default `morgan.combined`
   */
  format: string;
  /**
   * Whether to automatically integrate with Elastic APM (https:github.com/elastic/apm-agent-nodejs).
   *
   * If a started APM agent is detected, then log records will include the following fields:
   *  - "service.name" - the configured serviceName in the agent
   *  - "event.dataset" - set to "$serviceName.log" for correlation in Kibana
   *  - "trace.id", "transaction.id", and "span.id" - if there is a current active trace when the log call is made
   *
   * @default true
   */
  apmIntegration: boolean;
}

declare function ecsFormat(opts?: Config): FormatFn;

export = ecsFormat;
