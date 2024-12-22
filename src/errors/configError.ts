type ConfigErrorType = "mismatch" | "missing-configuration" | "missing-column";

const DEFAULT_MESSAGES: Record<ConfigErrorType, string> = {
  mismatch: "",
  "missing-configuration": "",
  "missing-column": "",
};
export class ConfigError extends Error {
  public configNames: string[];
  public type: ConfigErrorType;
  constructor(
    type: ConfigErrorType,
    configNames: string | string[],
    message?: string
  ) {
    super(message);
    this.type = type;
    this.configNames = Array.isArray(configNames) ? configNames : [configNames];
    this.message = message ? message : DEFAULT_MESSAGES[this.type];
  }
}
