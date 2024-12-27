import { CONFIGURATION_TYPES } from "../constants/INFRA";
import { ValidationResult } from "../server";
import { ConfigItem } from "../types/configTypes";

export function validateConfigItems(
  configItems: ConfigItem[]
): ValidationResult<undefined, Record<string, string[]>> {

  //Validate individual fields only..

  const errors: Record<string, string[]> = {};

  for(let i = 0; i < configItems.length; i++){
    const configErrors = [];
    const configItem = configItems[i];

    const allowedTypes = Object.values(CONFIGURATION_TYPES);

    if(!allowedTypes.includes(configItem.type)){
        configErrors.push(`Configuration Type is either missing or not supported`)
    }






    errors[configItem.name] = configErrors;
  }
  return {
    status: "success",
  };
}
