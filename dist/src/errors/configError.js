export class ConfigError extends Error {
    configName;
    errorType;
    constructor(configName, errorType, message) {
        super(message);
        this.configName = configName;
        this.errorType = errorType;
    }
}
//# sourceMappingURL=configError.js.map