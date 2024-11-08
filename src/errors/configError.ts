export class ConfigError extends Error {
  public configName: string;
  public errorType: "MISSING" | "INVALID";
  constructor(
    configName: string,
    errorType: "MISSING" | "INVALID",
    message?: string
  ) {
    super(message);
    this.configName = configName;
    this.errorType = errorType;
  }
}
