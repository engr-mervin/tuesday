import { ErrorObject, ValidationResult } from "../types/generalTypes.js";
import { ThemeParameter } from "../types/themeTypes.js";
import { validateParameter } from "./parameterValidators.js";

export function validateThemeItems(
  themeItems: ThemeParameter[]
): ErrorObject[] {
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

  return errors;
}
