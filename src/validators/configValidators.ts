import {
  ALL_CONFIG_CLASSIFICATIONS,
  CONFIGURATION_TYPES,
  FIELDS_BANNER,
  FIELDS_EMAIL,
  FIELDS_HOLOGRAM,
  FIELDS_NEPTUNE_CONFIG,
  FIELDS_NEPTUNE_ID,
  FIELDS_NEPTUNE_OPT_IN_ID,
  FIELDS_OMG,
  FIELDS_PACMAN_CONFIG,
  FIELDS_PROMOCODE_CONFIG,
  FIELDS_PUSH,
  FIELDS_REMOVE_NEPTUNE_ID,
  FIELDS_SEGMENT_FILTER,
  FIELDS_SMS,
} from "../constants/INFRA";
import { BANNER_REGEX, HOLOGRAM_REGEX } from "../constants/REGEXES";
import {
  isCommaSeparatedListOfIntegers,
  isFloatInRange,
  isInsideClosedListStrict,
  isIntegerInRange,
  isIntegerNonEmpty,
  isNumberInRange,
  isStringOfLength,
  isValidTime,
} from "../helpers/validatorFunctions";
import { ValidationResult } from "../server";
import { ConfigItem, ConfigItemField } from "../types/configTypes";
import { validateParameter } from "./parameterValidators";

export function validateConfigItems(
  configItems: ConfigItem[]
): ValidationResult<undefined, Record<string, string[]>> {
  const errors: Record<string, string[]> = {};

  for (let i = 0; i < configItems.length; i++) {
    const configItem = configItems[i];

    const allowedTypes = Object.values(CONFIGURATION_TYPES);

    if (!allowedTypes.includes(configItem.type)) {
      errors[configItem.name] = [
        `Configuration Type is either missing or not supported`,
      ];
      continue;
    }

    const validator = configValidationRules[configItem.type];
    const configErrors = validator(configItem);

    if (configErrors.length) {
      errors[configItem.name] = configErrors;
    }
  }
  return {
    status: "success",
  };
}

export const configValidationRules: Record<
  string,
  (configItem: ConfigItem) => string[]
> = {
  [CONFIGURATION_TYPES.Promocode_Config]: (configItem: ConfigItem) => {
    const errors: string[] = [];

    if (!configItem.fields) {
      errors.push(`Promocode Config fields are missing.`);
      return errors;
    }

    //Validate required fields
    const requiredFields = [FIELDS_PROMOCODE_CONFIG.Template_ID];

    for (const requiredField of requiredFields) {
      if (!configItem.fields.find((field) => field.fieldId === requiredField)) {
        errors.push(`Missing required field: ${requiredField}`);
      }
    }

    //Validate value
    for (const field of configItem.fields) {
      const paramSet = new Set();
      const nonParamSet = new Set();
      const { fieldId, value, name } = field;

      if (
        [
          FIELDS_PACMAN_CONFIG.Email_Parameter,
          FIELDS_PACMAN_CONFIG.OMG_Parameter,
        ].includes(fieldId)
      ) {
        const identifier = `${name}_${fieldId}`;
        if (paramSet.has(identifier)) {
          errors.push(
            `Promocode parameter: ${name} - ${fieldId} must be unique.`
          );
        } else {
          paramSet.add(identifier);
        }
      } else {
        //Test field uniqueness if not params
        if (nonParamSet.has(fieldId)) {
          errors.push(
            `Promocode field: ${name} of field name - ${fieldId} must be unique.`
          );
        } else {
          nonParamSet.add(fieldId);
        }
      }
      switch (fieldId) {
        case FIELDS_PROMOCODE_CONFIG.Template_ID:
          if (!isIntegerNonEmpty(value)) {
            errors.push(`${fieldId} should be a number.`);
          }
          break;
        case FIELDS_PROMOCODE_CONFIG.Duration_Days:
        case FIELDS_PROMOCODE_CONFIG.Bonus_Percentage:
          if (!isNumberInRange(value, 1, 99)) {
            errors.push(`${fieldId} should be a number between 1 and 99.`);
          }
          break;
        case FIELDS_PROMOCODE_CONFIG.Games:
          if (!isCommaSeparatedListOfIntegers(value)) {
            errors.push(
              `${fieldId} should be a string of numbers separated by commas.`
            );
          }
          break;
        case FIELDS_PROMOCODE_CONFIG.OMG_Parameter:
        case FIELDS_PROMOCODE_CONFIG.Email_Parameter:
          const paramErrors = validateParameter({
            parameterName: name,
            values: { Config: value },
          });
          if (paramErrors.length) {
            errors.push(...paramErrors);
          }
          break;
        default:
          errors.push(`${fieldId} field is not supported.`);
          break;
      }
    }
    return errors;
  },
  [CONFIGURATION_TYPES.Pacman_Config]: (configItem: ConfigItem) => {
    const errors: string[] = [];
    if (!configItem.fields) {
      errors.push(`Pacman Config fields are missing.`);
      return errors;
    }

    //Validate required fields
    const requiredFields = [
      FIELDS_PACMAN_CONFIG.Promo_Templates,
      FIELDS_PACMAN_CONFIG.Bonus_Description,
      FIELDS_PACMAN_CONFIG.Promo_Description,
    ];

    for (const requiredField of requiredFields) {
      if (!configItem.fields.find((field) => field.fieldId === requiredField)) {
        errors.push(`Missing required field: ${requiredField}`);
      }
    }

    //Test uniqueness, name_field for params, name for non-param
    const paramSet = new Set();
    const nonParamSet = new Set();

    for (const field of configItem.fields) {
      const { name, value, fieldId } = field;
      if (
        [
          FIELDS_PACMAN_CONFIG.Email_Parameter,
          FIELDS_PACMAN_CONFIG.OMG_Parameter,
        ].includes(fieldId)
      ) {
        const identifier = `${name}_${fieldId}`;
        if (paramSet.has(identifier)) {
          errors.push(
            `Neptune Pacman parameter: ${name} - ${fieldId} must be unique.`
          );
        } else {
          paramSet.add(identifier);
        }
      } else {
        //Test field uniqueness if not params
        if (nonParamSet.has(fieldId)) {
          errors.push(
            `Neptune Pacman field: ${name} of field name - ${fieldId} must be unique.`
          );
        } else {
          nonParamSet.add(fieldId);
        }
      }

      switch (fieldId) {
        case FIELDS_PACMAN_CONFIG.Promo_Templates:
          if (!isIntegerNonEmpty(value)) {
            errors.push(`${field} must be a valid integer.`);
          }
          break;
        case FIELDS_PACMAN_CONFIG.Company:
          if (!isIntegerInRange(value, 1, 1000)) {
            errors.push(`${field} must be a number between 1 to 1,000.`);
          }
          break;
        case FIELDS_PACMAN_CONFIG.Promo_Description:
        case FIELDS_PACMAN_CONFIG.Bonus_Description:
          if (!isStringOfLength(value)) {
            errors.push(`${field} must be a valid string.`);
          }
          break;
        case FIELDS_PACMAN_CONFIG.Duration_Days:
          if (!isIntegerInRange(value, 1, 99)) {
            errors.push(`${field} must be a number between 1 to 99.`);
          }
          break;
        case FIELDS_PACMAN_CONFIG.Bonus_Percentage:
          if (!isIntegerInRange(value, 0, 100)) {
            errors.push(`${field} must be a number between 0 to 100.`);
          }
          break;
        case FIELDS_PACMAN_CONFIG.Games:
          if (!isCommaSeparatedListOfIntegers(value)) {
            errors.push(`${field} must be a comma separated list of numbers.`);
          }
          break;
        case FIELDS_PACMAN_CONFIG.OMG_Parameter:
        case FIELDS_PACMAN_CONFIG.Email_Parameter:
          const paramErrors = validateParameter({
            parameterName: name,
            values: { Config: value },
          });
          if (paramErrors.length) {
            errors.push(...paramErrors);
          }
          break;
        default:
          errors.push(`${fieldId} field is not supported.`);
          break;
      }
    }

    return errors;
  },
  [CONFIGURATION_TYPES.Neptune_Config]: (configItem: ConfigItem) => {
    const errors: string[] = [];
    if (!configItem.fields) {
      errors.push(`Neptune Config fields are missing.`);
      return errors;
    }

    //Validate required fields
    const requiredFields = [
      FIELDS_NEPTUNE_CONFIG.Duration_End_Day,
      FIELDS_NEPTUNE_CONFIG.Duration_End_Hour,
      FIELDS_NEPTUNE_CONFIG.Duration_Start_Day,
      FIELDS_NEPTUNE_CONFIG.Duration_Start_Hour,
      FIELDS_NEPTUNE_CONFIG.Neptune_Type,
    ];

    for (const requiredField of requiredFields) {
      if (!configItem.fields.find((field) => field.fieldId === requiredField)) {
        errors.push(`Missing required field: ${requiredField}`);
      }
    }

    const fieldObj: Record<string, ConfigItemField> = {};
    for (const field of configItem.fields) {
      fieldObj[field.fieldId] = field;
    }

    const campTemplate = fieldObj[FIELDS_NEPTUNE_CONFIG.Campaign_Template];
    const ruleTemplate = fieldObj[FIELDS_NEPTUNE_CONFIG.Rule_Template];
    const startDay = fieldObj[FIELDS_NEPTUNE_CONFIG.Duration_Start_Day];
    const startTime = fieldObj[FIELDS_NEPTUNE_CONFIG.Duration_Start_Hour];
    const endDay = fieldObj[FIELDS_NEPTUNE_CONFIG.Duration_End_Day];
    const endTime = fieldObj[FIELDS_NEPTUNE_CONFIG.Duration_End_Hour];
    const intoNeptune = fieldObj[FIELDS_NEPTUNE_CONFIG.Into_Neptune];
    const neptuneType = fieldObj[FIELDS_NEPTUNE_CONFIG.Neptune_Type];
    const neptuneDuration = fieldObj[FIELDS_NEPTUNE_CONFIG.Neptune_Duration];

    //Business rule validations
    if ((!campTemplate && !ruleTemplate) || (campTemplate && ruleTemplate)) {
      errors.push(
        `Neptune should have either campaign template or rule template but not both.`
      );
    }

    if (neptuneType && neptuneType.value === "Opt-in") {
      if (!campTemplate) {
        errors.push(
          `Neptune should use a campaign template if the neptune type is 'Opt-in'.`
        );
      }

      if (!neptuneDuration || neptuneDuration.value === "") {
        errors.push(
          `Neptune should have a neptune duration value if the neptune type is 'Opt-in'.`
        );
      } else {
        if (!isIntegerInRange(neptuneDuration.value, 1)) {
          errors.push(
            `Neptune is of type 'Opt-in' but does not have a valid neptune duration value.`
          );
        }
      }
    }

    if (ruleTemplate && !intoNeptune) {
      errors.push(
        `Neptune has a rule template but missing the into neptune field.`
      );
    }

    //Test uniqueness, name_field for params, name for non-param
    const fieldSet = new Set();
    for (const field of configItem.fields) {
      const { name, value, fieldId } = field;

      //Test field uniqueness if not params
      if (fieldSet.has(fieldId)) {
        errors.push(
          `Neptune Pacman field: ${name} of field name - ${fieldId} must be unique.`
        );
      } else {
        fieldSet.add(fieldId);
      }

      switch (fieldId) {
        case FIELDS_NEPTUNE_CONFIG.Campaign_Template:
        case FIELDS_NEPTUNE_CONFIG.Rule_Template:
        case FIELDS_NEPTUNE_CONFIG.Into_Neptune:
          if (!isIntegerInRange(value, 1)) {
            errors.push(`${fieldId} must be a valid integer.`);
          }
          break;
        case FIELDS_NEPTUNE_CONFIG.Neptune_Type:
          if (!isInsideClosedListStrict(value, "Regular", "Opt-in")) {
            errors.push(`${fieldId} value must be 'Regular' or 'Opt-in`);
          }
          break;
        case FIELDS_NEPTUNE_CONFIG.Duration_Start_Day:
        case FIELDS_NEPTUNE_CONFIG.Duration_End_Day:
          if (!isIntegerInRange(value, 0, 1000)) {
            errors.push(`${fieldId} must be a valid string.`);
          }
          break;
        case FIELDS_NEPTUNE_CONFIG.Duration_Start_Hour:
        case FIELDS_NEPTUNE_CONFIG.Duration_End_Hour:
          if (!isValidTime(value)) {
            errors.push(`${field} must be a valid time in HH:MM format`);
          }
          break;
        case FIELDS_NEPTUNE_CONFIG.Grant_Pacman:
          if (!isStringOfLength(value)) {
            errors.push(`${fieldId} must be a valid string.`);
          }
          break;
        case FIELDS_NEPTUNE_CONFIG.Filter_Casino_Bet_Amount:
        case FIELDS_NEPTUNE_CONFIG.Filter_Sport_Bet_Amount:
        case FIELDS_NEPTUNE_CONFIG.Filter_Sport_Bet_Odds:
        case FIELDS_NEPTUNE_CONFIG.Filter_Combination_Bet_Odds:
        case FIELDS_NEPTUNE_CONFIG.Filter_Number_Of_Legs:
          if (!isFloatInRange(value, 0)) {
            errors.push(`${fieldId} must be a number between 0 and 1,000,000.`);
          }
          break;
        case FIELDS_NEPTUNE_CONFIG.Filter_Games_List:
        case FIELDS_NEPTUNE_CONFIG.Filter_Game_Groups:
        case FIELDS_NEPTUNE_CONFIG.Filter_Game_Categories:
        case FIELDS_NEPTUNE_CONFIG.Filter_Spectate_Event_ID:
        case FIELDS_NEPTUNE_CONFIG.Filter_Spectate_Sport_Tournament:
        case FIELDS_NEPTUNE_CONFIG.Filter_Spectate_Sport_Type:
          if (!isCommaSeparatedListOfIntegers(value)) {
            errors.push(
              `${fieldId} must be a comma separated list of numbers.`
            );
          }
          break;
        default:
          errors.push(`${fieldId} field is not supported.`);
          break;
      }
    }

    if (Number(startDay.value) > Number(endDay.value)) {
      errors.push(`Neptune end day is earlier than the start day.`);
    } else if (Number(startDay.value) === Number(endDay.value)) {
      //Validate hours
      const [startHour, startMin] = startTime.value.split(":").map(Number);
      const [endHour, endMin] = endTime.value.split(":").map(Number);

      if (startHour * 60 + startMin >= endHour * 60 + endMin) {
        errors.push(
          `Neptune end time is earlier than or equal to the start time`
        );
      }
    }

    return errors;
  },
  [CONFIGURATION_TYPES.Neptune_Bind]: (configItem: ConfigItem) => {
    //NOTE: Intervalidation of checking if value exists in neptune config.
    //No validation here anymore.
    return [];
  },
  [CONFIGURATION_TYPES.Banner]: (configItem: ConfigItem) => {
    const { fieldName, segments } = configItem;
    const errors = [];
    const values = Object.values(segments);
    if (fieldName.toLowerCase().includes("id")) {
      for (const value of values) {
        if (!BANNER_REGEX.test(value)) {
          errors.push(`The Banner ID should be in 8-4-4-4-12 format only.`);
        }
      }
    }
    if (
      [
        FIELDS_BANNER.Banner_Schedule_Start_Hour,
        FIELDS_BANNER.Banner_Schedule_End_Hour,
      ].includes(fieldName)
    ) {
      for (const value of values) {
        if (!isValidTime(value)) {
          errors.push(`Value should be in HH:MM format.`);
        }
      }
    }

    if (FIELDS_BANNER.Banner_Duration_Start_Day === fieldName) {
      for (const value of values) {
        if (!isIntegerInRange(value, 0, 1)) {
          errors.push(`Value should be either 0 or 1.`);
        }
      }
    }

    if (FIELDS_BANNER.Banner_Duration_End_Day === fieldName) {
      for (const value of values) {
        if (!isIntegerInRange(value, 1, 99)) {
          errors.push(`Value should from 1-99.`);
        }
      }
    }
    return errors;
  },
  [CONFIGURATION_TYPES.Personal_Hologram]: (configItem: ConfigItem) => {
    const { fieldName, segments } = configItem;
    const errors = [];
    const values = Object.values(segments);

    if ((FIELDS_HOLOGRAM.Duration_Start_Day = fieldName)) {
      for (const value of values) {
        if (!isIntegerInRange(value, 0, 1)) {
          errors.push(`Value should be either 0 or 1.`);
        }
      }
    }
    if (FIELDS_HOLOGRAM.Duration_End_Day == fieldName) {
      for (const value of values) {
        if (!isIntegerInRange(value, 1, 99)) {
          errors.push(`Value should from 1-99.`);
        }
      }
    }

    // if (
    //   [
    //     FIELDS_HOLOGRAM.Casino_Hologram_ID,
    //     FIELDS_HOLOGRAM.Poker_Hologram_ID,
    //     FIELDS_HOLOGRAM.Triple_Seven_Hologram_ID,
    //     FIELDS_HOLOGRAM.Sport_Hologram_ID,
    //   ].includes(fieldName)
    // ) {
    //   for (const value of values) {
    //     if (!HOLOGRAM_REGEX.test(value)) {
    //       errors.push(`Value should only contain digits and letters.`);
    //     }
    //   }
    // }
    return errors;
  },

  [CONFIGURATION_TYPES.Email]: (configItem: ConfigItem) => {
    const { fieldName, segments } = configItem;
    const errors = [];
    const values = Object.values(segments);

    if (FIELDS_EMAIL.Email_Template_ID === fieldName) {
      for (const value of values) {
        if (!isIntegerInRange(value, 10_000_000, 99_999_999, [-1])) {
          errors.push(`Value should be 8 digits or -1.`);
        }
      }
    }

    if (FIELDS_EMAIL.Email_Schedule_Hour === fieldName) {
      for (const value of values) {
        if (!isValidTime(value)) {
          errors.push(`Value should be in HH:MM format.`);
        }
      }
    }

    return errors;
  },
  [CONFIGURATION_TYPES.OMG]: (configItem: ConfigItem) => {
    const { fieldName, segments } = configItem;
    const errors = [];
    const values = Object.values(segments);

    if (FIELDS_OMG.OMG_Template_ID === fieldName) {
      for (const value of values) {
        if (!isIntegerInRange(value, 10_000, 99_999, [-1])) {
          errors.push(`Value should be 5 digits or -1.`);
        }
      }
    }

    if (FIELDS_OMG.OMG_Schedule_Hour === fieldName) {
      for (const value of values) {
        if (!isValidTime(value)) {
          errors.push(`Value should be in HH:MM format.`);
        }
      }
    }

    return errors;
  },
  [CONFIGURATION_TYPES.Push]: (configItem: ConfigItem) => {
    const { fieldName, segments } = configItem;
    const errors = [];
    const values = Object.values(segments);

    if (FIELDS_PUSH.Push_Template_ID === fieldName) {
      for (const value of values) {
        if (!isIntegerInRange(value, 1, 99_999, [-1])) {
          errors.push(`Value should be 1-5 digits or -1.`);
        }
      }
    }

    if (FIELDS_PUSH.Push_Schedule_Hour === fieldName) {
      for (const value of values) {
        if (!isValidTime(value)) {
          errors.push(`Value should be in HH:MM format.`);
        }
      }
    }

    return errors;
  },

  [CONFIGURATION_TYPES.SMS]: (configItem: ConfigItem) => {
    const { fieldName, segments } = configItem;
    const errors = [];
    const values = Object.values(segments);

    if (FIELDS_SMS.SMS_Template_ID === fieldName) {
      for (const value of values) {
        if (!isIntegerInRange(value, 1, 99_999, [-1])) {
          errors.push(`Value should be 1-5 digits or -1.`);
        }
      }
    }

    if (FIELDS_SMS.SMS_Schedule_Hour === fieldName) {
      for (const value of values) {
        if (!isValidTime(value)) {
          errors.push(`Value should be in HH:MM format.`);
        }
      }
    }

    return errors;
  },

  [CONFIGURATION_TYPES.Neptune]: (configItem: ConfigItem) => {
    const { fieldName, segments } = configItem;
    const errors = [];
    const values = Object.values(segments);

    if (FIELDS_NEPTUNE_ID.Neptune_ID === fieldName) {
      for (const value of values) {
        if (!isIntegerInRange(value, -1)) {
          errors.push(`Value should a positive integer or -1.`);
        }
      }
    }

    return errors;
  },
  [CONFIGURATION_TYPES.Remove_Neptune]: (configItem: ConfigItem) => {
    const { fieldName, segments } = configItem;
    const errors = [];
    const values = Object.values(segments);

    if (FIELDS_REMOVE_NEPTUNE_ID.Neptune_Remove_Neptune_ID === fieldName) {
      for (const value of values) {
        if (!isIntegerInRange(value, -1)) {
          errors.push(`Value should a positive integer or -1.`);
        }
      }
    }

    return errors;
  },
  [CONFIGURATION_TYPES.Neptune_Opt_In]: (configItem: ConfigItem) => {
    const { fieldName, segments } = configItem;
    const errors = [];
    const values = Object.values(segments);

    if (FIELDS_NEPTUNE_OPT_IN_ID.Neptune_Opt_In_ID === fieldName) {
      for (const value of values) {
        if (!isIntegerInRange(value, -1)) {
          errors.push(`Value should a positive integer or -1.`);
        }
      }
    }

    return errors;
  },
  [CONFIGURATION_TYPES.Segment_Filter]: (configItem: ConfigItem) => {
    const { fieldName, segments } = configItem;
    const errors = [];
    const values = Object.values(segments);

    if (
      [
        FIELDS_SEGMENT_FILTER.Cashback_Base_Sum,
        FIELDS_SEGMENT_FILTER.Cashback_Total_Bet_Seg,
      ].includes(fieldName)
    ) {
      for (const value of values) {
        const [minVal, maxVal] = value.split("-");
        if (!isIntegerInRange(minVal, 0) || !isIntegerInRange(maxVal, 0)) {
          errors.push(`Value should be in the format XXX-YYY.`);
        }

        if (minVal >= maxVal) {
          errors.push(`Upper bound greater than lower bound.`);
        }
      }
    }
    return errors;
  },
};
