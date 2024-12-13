export class ConfigError extends Error {
  public configNames: string[];
  constructor(
    configNames: string[],
    message?: string
  ) {
    super(message);
    this.configNames = configNames;
  }
}
