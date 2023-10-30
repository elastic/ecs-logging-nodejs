import type { FormatFn } from "morgan";

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
   * Whether to automatically integrate with
   * Elastic APM (https://github.com/elastic/apm-agent-nodejs). If a started
   * APM agent is detected, then log records will include the following
   * fields:
   *
   * - "trace.id", "transaction.id", and "span.id" - if there is a current
   *   active trace when the log call is made
   *
   * and also the following fields, if not already specified in this config:
   *
   * - "service.name" - the configured `serviceName` in the agent
   * - "service.version" - the configured `serviceVersion` in the agent
   * - "service.environment" - the configured `environment` in the agent
   * - "service.node.name" - the configured `serviceNodeName` in the agent
   * - "event.dataset" - set to `${serviceName}` for correlation in Kibana
   *
   * @default true.
   */
  apmIntegration?: boolean;

  /** Specify "service.name" field. Defaults to a value from the APM agent, if available. */
  serviceName?: string;
  /** Specify "service.version" field. Defaults to a value from the APM agent, if available. */
  serviceVersion?: string;
  /** Specify "service.environment" field. Defaults to a value from the APM agent, if available. */
  serviceEnvironment?: string;
  /** Specify "service.node.name" field. Defaults to a value from the APM agent, if available. */
  serviceNodeName?: string;
  /** Specify "event.dataset" field. Defaults `${serviceName}`. */
  eventDataset?: string;

}

declare function ecsFormat(config?: Config): FormatFn;

export default ecsFormat;
export { ecsFormat }
