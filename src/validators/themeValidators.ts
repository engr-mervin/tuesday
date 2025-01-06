import { ErrorObject, ValidationResult } from "../types/generalTypes.js";
import { ThemeParameter } from "../types/themeTypes.js";
import { validateParameter } from "./parameterValidators.js";

export function validateThemeItems(
  themeItems: ThemeParameter[]
): ValidationResult<ThemeParameter[]> {
  const errors: ErrorObject[] = [];
  for (const themeItem of themeItems) {
    const name = themeItem.parameterName;
    const paramErrors = validateParameter(themeItem);
    if (paramErrors.length) {
      errors.push({
        name,
        errors: paramErrors,
      });
    }
  }

  return errors.length
    ? {
        status: "fail",
        data: errors,
      }
    : {
        status: "success",
        data: themeItems,
      };
}
