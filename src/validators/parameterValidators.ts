import { LIMITS, PARAM_TYPES } from "../constants/INFRA";
import { PARAM_REGEX } from "../constants/REGEXES";
import { isValidNumber } from "../helpers/validatorFunctions";

export function validateParameter(parameter: {
  parameterName: string;
  values: { [key: string]: string | null };
  parameterType: string;
}): string[] {
  const errors = [];
  //Validate name
  const name = parameter.parameterName;
  if (name.length > LIMITS.Max_Param_Length) {
    errors.push(`Parameter name exceeds max length.`);
  }
  if (name.length < LIMITS.Min_Param_Length) {
    errors.push(`Parameter name is below min length.`);
  }

  //NOTE: Unlike campaigns, the granularity here is item, not cell, so if a validation for an item does not depend
  //on another item, we put it here, otherwise in the inter-validation
  for (const seg in parameter.values) {
    const value = parameter.values[seg];
    if (value !== null && PARAM_REGEX.test(value)) {
      errors.push(
        `Parameter value must not contain special characters (|, Enter, New-Line).`
      );
    }
    if (
      [
        PARAM_TYPES.Cashback_Percent_Amount,
        PARAM_TYPES.Cashback_Cap_Amount,
        PARAM_TYPES.Cashback_Final_Amount,
        PARAM_TYPES.Times,
        PARAM_TYPES.Free_Amount,
        PARAM_TYPES.Max_Free_Amount,
      ].includes(parameter.parameterType) &&
      !isValidNumber(value, 0, 99) //TODO: Verify if this is digits or range
    ) {
      errors.push(`Parameter value should be between 0 - 99.`);
    }
  }
  return errors;
}
