import { start } from "repl";
import {
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
  PROMO_CONFIG_CLASSIFICATIONS,
  PROMO_META_CLASSIFICATIONS,
  PROMO_PAGE_CLASSIFICATIONS,
  REQUIRED_PROMO_CONFIG_CLASSIFICATIONS,
  REQUIRED_PROMO_CTA_CLASSIFICATIONS,
  REQUIRED_PROMO_IMAGE_CLASSIFICATIONS,
  REQUIRED_PROMO_META_CLASSIFICATIONS,
  REQUIRED_PROMO_TEXT_CLASSIFICATIONS,
  ROUND_TYPES,
} from "../constants/infraConstants.js";
import { BANNER_REGEX } from "../constants/regexConstants.js";
import { arrayToCommaSeparatedList } from "../helpers/stringFunctions.js";
import {
  isCommaSeparatedListOfIntegers,
  isFloatInRange,
  isInsideClosedListStrict,
  isIntegerInRange,
  isIntegerNonEmpty,
  isNumberInRange,
  isStringOfLength,
  isValidTime,
} from "../helpers/validatorFunctions.js";
import {
  ConfigItem,
  ConfigItemField,
  ValidatedConfigItem,
} from "../types/configTypes.js";
import { ErrorObject, Time, ValidationResult } from "../types/generalTypes.js";
import { validateParameter } from "./parameterValidators.js";
import { Round } from "./roundValidators.js";
import { timeStringToMinutes } from "../helpers/dateFunctions.js";

export function validateConfigItems(configItems: ConfigItem[]): ErrorObject[] {
  const errors: ErrorObject[] = [];

  for (let i = 0; i < configItems.length; i++) {
    const configItem = configItems[i];

    const allowedTypes = Object.values(CONFIGURATION_TYPES);

    if (!allowedTypes.includes(configItem.type)) {
      errors.push({
        name: configItem.name,
        errors: [`Configuration Type is either missing or not supported`],
      });
      continue;
    }

    const validator = configValidationRules[configItem.type];
    const configErrors = validator(configItem);

    if (configErrors.length) {
      errors.push({
        name: configItem.name,
        errors: configErrors,
      });
    }
  }
  return errors;
}

//segment name : {type, fieldName, value}
// {[type]: value}[]
export function validateConfigSegments(
  configItems: ValidatedConfigItem[]
): ErrorObject[] {
  const errors: ErrorObject[] = [];

  const banners = configItems.filter(
    (item) => item.type === CONFIGURATION_TYPES.Banner
  );

  const startDay = banners.find(
    (banner) => banner.fieldName === FIELDS_BANNER.Banner_Duration_Start_Day
  );
  const endDay = banners.find(
    (banner) => banner.fieldName === FIELDS_BANNER.Banner_Duration_End_Day
  );

  const startHour = banners.find(
    (banner) => banner.fieldName === FIELDS_BANNER.Banner_Schedule_Start_Hour
  );
  const endHour = banners.find(
    (banner) => banner.fieldName === FIELDS_BANNER.Banner_Schedule_End_Hour
  );

  for (const segment in configItems[0].segments) {
    const segErrors: string[] = [];
    if (startDay && endDay && startHour && endHour) {
      if (startDay.segments[segment] === endDay.segments[segment]) {
        const startMinutes = timeStringToMinutes(
          startHour.segments[segment] as Time
        );
        const endMinutes = timeStringToMinutes(
          endHour.segments[segment] as Time
        );

        if (startMinutes >= endMinutes) {
          segErrors.push(`Start hour is greater than End hour.`);
        }
      }
    }

    if (segErrors.length) {
      errors.push({
        name: segment,
        errors: segErrors,
      });
    }
  }

  return errors;
}

export function validateConfigGroup(
  configItems: ValidatedConfigItem[]
): string[] {
  //Validate config items that can only have one record...
  const errors: string[] = [];
  const configSet = new Set();

  //NOTE: Currently not round scoped
  const uniqueConfigs = [
    CONFIGURATION_TYPES.Neptune_Bind,
    CONFIGURATION_TYPES.Promotion_Config,
    CONFIGURATION_TYPES.Promotion_Meta,
  ];
  for (const configItem of configItems) {
    if (uniqueConfigs.includes(configItem.type)) {
      if (configSet.has(configItem.type)) {
        errors.push(`${configItem.type} should only have one record.`);
      }

      configSet.add(configItem.type);
    }
  }

  //Validate config items that can be duplicated but has the same name
  const configNameSet = new Set();
  const uniqueNameConfigs = [
    CONFIGURATION_TYPES.Neptune_Config,
    CONFIGURATION_TYPES.Pacman_Config,
    CONFIGURATION_TYPES.Promocode_Config,
    CONFIGURATION_TYPES.Promotion_Image,
    CONFIGURATION_TYPES.Promotion_Text,
    CONFIGURATION_TYPES.Promotion_CTA,
  ];

  for (const configItem of configItems) {
    const uniqueIdentifier = `${configItem.type}___${configItem.name}`;
    if (uniqueNameConfigs.includes(configItem.type)) {
      if (configNameSet.has(uniqueIdentifier)) {
        errors.push(
          `Two or more ${configItem.type} records have the same name: ${configItem.name}.`
        );
      }

      configNameSet.add(uniqueIdentifier);
    }
  }

  //Validate config items that can be duplicated but has the same classification
  const configFieldSet = new Set();
  const uniqueFieldConfigs = [
    CONFIGURATION_TYPES.Personal_Hologram,
    CONFIGURATION_TYPES.Banner,
    CONFIGURATION_TYPES.SMS,
    CONFIGURATION_TYPES.Push,
    CONFIGURATION_TYPES.Email,
    CONFIGURATION_TYPES.Neptune,
    CONFIGURATION_TYPES.Neptune_Opt_In,
    CONFIGURATION_TYPES.Remove_Neptune,
    CONFIGURATION_TYPES.OMG,
    CONFIGURATION_TYPES.Segment_Filter,
  ];

  for (const configItem of configItems) {
    const uniqueIdentifier = `${configItem.round}__${configItem.type}___${configItem.fieldName}`;
    if (uniqueFieldConfigs.includes(configItem.type)) {
      if (configFieldSet.has(uniqueIdentifier)) {
        errors.push(
          `Two or more ${configItem.type} records have the same field name: ${configItem.fieldName}.`
        );
      }

      configFieldSet.add(uniqueIdentifier);
    }
  }

  //Validate existence of dependency configs:
  //e.g. Neptune bind should have a neptune config record
  const neptuneBind = configItems.find(
    (item) => item.type === CONFIGURATION_TYPES.Neptune_Bind
  );
  const neptuneConfigs = configItems.filter(
    (item) => item.type === CONFIGURATION_TYPES.Neptune_Config
  );

  if (
    (neptuneBind && neptuneConfigs.length === 0) ||
    (!neptuneBind && neptuneConfigs.length > 0)
  ) {
    errors.push(`Neptune bind and neptune config should be defined together.`);
  }

  //Also validate if all values in neptune bind exists in neptune config.
  if (neptuneBind && neptuneConfigs.length > 0) {
    const neptuneNames = Object.values(neptuneBind.segments).filter(
      (nepName) => nepName
    );

    const missingNeptunes = neptuneNames.filter((neptuneName) =>
      neptuneConfigs.find((config) => config.name === neptuneName)
    );

    if (missingNeptunes.length > 0) {
      errors.push(
        `Neptune configs are missing in neptune bind: ${arrayToCommaSeparatedList(
          missingNeptunes
        )}`
      );
    }
  }

  const promoText = configItems.find(
    (item) => item.type === CONFIGURATION_TYPES.Promotion_Text
  );
  const promoImage = configItems.find(
    (item) => item.type === CONFIGURATION_TYPES.Promotion_Image
  );
  const promoCTA = configItems.find(
    (item) => item.type === CONFIGURATION_TYPES.Promotion_CTA
  );
  const promoConfig = configItems.find(
    (item) => item.type === CONFIGURATION_TYPES.Promotion_Config
  );

  if ((promoImage || promoCTA || promoText) && !promoConfig) {
    errors.push(
      `Promotion elements defined but missing Promotion Configuration item.`
    );
  }

  return errors;
}

//There are a lot of code duplication here, this is a tradeoff introduced by
//wanting to enclose all the validations of each config type in its own validator.
//should we need to refactor, maybe grouping the config types is a good idea
//e.g., nested configs, inline configs
//then validate required fields of nested config
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
    const paramSet = new Set();
    const nonParamSet = new Set();
    for (const field of configItem.fields) {
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
    //Only validation here is to check if it has at least one segment value:

    if (Object.values(configItem.segments).every((segment) => segment === "")) {
      return [`Neptune bind does not have any values.`];
    }
    return [];
  },
  [CONFIGURATION_TYPES.Banner]: (configItem: ConfigItem) => {
    const { fieldName, segments } = configItem;
    const errors = [];
    const values = Object.values(segments);

    if (!Object.values(ROUND_TYPES).includes(configItem.round as Round)) {
      errors.push(`Round type is invalid: ${configItem.round}`);
    }

    if (fieldName.toLowerCase().includes("id")) {
      for (const value of values) {
        if (value.length && !BANNER_REGEX.test(value)) {
          //Empty string is valid.
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

    if (!Object.values(ROUND_TYPES).includes(configItem.round as Round)) {
      errors.push(`Round type is invalid: ${configItem.round}`);
    }

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

    if (!Object.values(ROUND_TYPES).includes(configItem.round as Round)) {
      errors.push(`Round type is invalid: ${configItem.round}`);
    }

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

    if (!Object.values(ROUND_TYPES).includes(configItem.round as Round)) {
      errors.push(`Round type is invalid: ${configItem.round}`);
    }
    //NOTE: Why is the if outside the for loop? because we only need
    //to check the field name once
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

    if (!Object.values(ROUND_TYPES).includes(configItem.round as Round)) {
      errors.push(`Round type is invalid: ${configItem.round}`);
    }
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

    if (!Object.values(ROUND_TYPES).includes(configItem.round as Round)) {
      errors.push(`Round type is invalid: ${configItem.round}`);
    }
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
    if (!Object.values(ROUND_TYPES).includes(configItem.round as Round)) {
      errors.push(`Round type is invalid: ${configItem.round}`);
    }
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

    if (!Object.values(ROUND_TYPES).includes(configItem.round as Round)) {
      errors.push(`Round type is invalid: ${configItem.round}`);
    }
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

    if (!Object.values(ROUND_TYPES).includes(configItem.round as Round)) {
      errors.push(`Round type is invalid: ${configItem.round}`);
    }
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

    if (!Object.values(ROUND_TYPES).includes(configItem.round as Round)) {
      errors.push(`Round type is invalid: ${configItem.round}`);
    }
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
  [CONFIGURATION_TYPES.Promotion_Meta]: (configItem: ConfigItem) => {
    const { fields } = configItem;
    const errors = [];

    if (fields === undefined) {
      return [];
    }

    const missingRequiredFields = REQUIRED_PROMO_META_CLASSIFICATIONS.filter(
      (classification) =>
        !fields.find((field) => field.classification === classification)
    );

    if (missingRequiredFields.length) {
      errors.push(
        `Missing required fields: ${arrayToCommaSeparatedList(
          missingRequiredFields
        )}`
      );
    }

    const unsupportedFields = fields.filter(
      (field) =>
        !Object.values(PROMO_META_CLASSIFICATIONS).includes(
          field.classification
        )
    );

    if (unsupportedFields.length) {
      errors.push(
        `Invalid field classifications: ${arrayToCommaSeparatedList(
          unsupportedFields.map((field) => field.classification)
        )}`
      );
    }

    const missingFieldIds = fields.filter(
      (field) => !field.classification && !field.fieldId
    );

    if (missingFieldIds.length) {
      errors.push(
        `Missing both classification and field id: ${arrayToCommaSeparatedList(
          missingFieldIds.map((field) => field.name)
        )} `
      );
    }

    return errors;
  },
  [CONFIGURATION_TYPES.Promotion_Config]: (configItem: ConfigItem) => {
    const { fields } = configItem;
    const errors = [];

    if (fields === undefined) {
      return [];
    }

    const missingRequiredFields = REQUIRED_PROMO_CONFIG_CLASSIFICATIONS.filter(
      (classification) =>
        !fields.find((field) => field.classification === classification)
    );

    if (missingRequiredFields.length) {
      errors.push(
        `Missing required field classifications: ${arrayToCommaSeparatedList(
          missingRequiredFields
        )}`
      );
    }

    //NOTE: Empty means take the field Id value
    const unsupportedFields = fields.filter(
      (field) =>
        field.classification &&
        !Object.values(PROMO_CONFIG_CLASSIFICATIONS).includes(
          field.classification
        )
    );

    if (unsupportedFields.length) {
      errors.push(
        `Invalid classifications: ${arrayToCommaSeparatedList(
          unsupportedFields.map((field) => field.classification)
        )}`
      );
    }

    const missingFieldIds = fields.filter(
      (field) => !field.classification && !field.fieldId
    );

    if (missingFieldIds.length) {
      errors.push(
        `Missing both classification and field id: ${arrayToCommaSeparatedList(
          missingFieldIds.map((field) => field.name)
        )} `
      );
    }

    return errors;
  },
  [CONFIGURATION_TYPES.Promotion_Image]: (configItem: ConfigItem) => {
    const { fields } = configItem;
    const errors = [];

    if (fields === undefined) {
      return [];
    }

    const missingRequiredFields = REQUIRED_PROMO_IMAGE_CLASSIFICATIONS.filter(
      (classification) =>
        !fields.find((field) => field.classification === classification)
    );

    if (missingRequiredFields.length) {
      errors.push(
        `Missing required field classifications: ${arrayToCommaSeparatedList(
          missingRequiredFields
        )}`
      );
    }

    const unsupportedFields = fields.filter(
      (field) =>
        !Object.values(PROMO_PAGE_CLASSIFICATIONS).includes(
          field.classification
        )
    );

    if (unsupportedFields.length) {
      errors.push(
        `Invalid field classifications: ${arrayToCommaSeparatedList(
          unsupportedFields.map((field) => field.classification)
        )}`
      );
    }

    const missingFieldIds = fields.filter(
      (field) => !field.classification && !field.fieldId
    );

    if (missingFieldIds.length) {
      errors.push(
        `Missing both classification and field id: ${arrayToCommaSeparatedList(
          missingFieldIds.map((field) => field.name)
        )} `
      );
    }

    //Validate reference fields to have file/text values
    for (const field of fields) {
      if (
        [
          PROMO_PAGE_CLASSIFICATIONS.Desktop_Image,
          PROMO_PAGE_CLASSIFICATIONS.Mobile_Image,
        ].includes(field.classification)
      ) {
        if (!field.files || field.files.length === 0) {
          errors.push(`${field.classification} is missing file values.`);
        }
      } else if (
        [PROMO_PAGE_CLASSIFICATIONS.Text].includes(field.classification)
      ) {
        if ((!field.files || field.files.length === 0) && !field.value) {
          errors.push(
            `${field.classification} is missing both file and text values.`
          );
        }
      } else {
        if (!field.value) {
          errors.push(`${field.classification} is missing text value.`);
        }
      }
    }

    return errors;
  },
  [CONFIGURATION_TYPES.Promotion_Text]: (configItem: ConfigItem) => {
    const { fields } = configItem;
    const errors = [];

    if (fields === undefined) {
      return [];
    }

    const missingRequiredFields = REQUIRED_PROMO_TEXT_CLASSIFICATIONS.filter(
      (classification) =>
        !fields.find((field) => field.classification === classification)
    );

    if (missingRequiredFields.length) {
      errors.push(
        `Missing required fields: ${arrayToCommaSeparatedList(
          missingRequiredFields
        )}`
      );
    }

    const unsupportedFields = fields.filter(
      (field) =>
        !Object.values(PROMO_PAGE_CLASSIFICATIONS).includes(
          field.classification
        )
    );

    if (unsupportedFields.length) {
      errors.push(
        `Invalid field classifications: ${arrayToCommaSeparatedList(
          unsupportedFields.map((field) => field.classification)
        )}`
      );
    }

    const missingFieldIds = fields.filter(
      (field) => !field.classification && !field.fieldId
    );

    if (missingFieldIds.length) {
      errors.push(
        `Missing both classification and field id: ${arrayToCommaSeparatedList(
          missingFieldIds.map((field) => field.name)
        )} `
      );
    }

    for (const field of fields) {
      if ([PROMO_PAGE_CLASSIFICATIONS.Text].includes(field.classification)) {
        if (!field.files && !field.value) {
          errors.push(
            `${field.classification} is missing both file and text values.`
          );
        }
      } else {
        if (!field.value) {
          errors.push(`${field.classification} is missing text value.`);
        }
      }
    }

    return errors;
  },
  [CONFIGURATION_TYPES.Promotion_CTA]: (configItem: ConfigItem) => {
    const { fields } = configItem;
    const errors = [];

    if (fields === undefined) {
      return [];
    }

    const missingRequiredFields = REQUIRED_PROMO_CTA_CLASSIFICATIONS.filter(
      (classification) =>
        !fields.find((field) => field.classification === classification)
    );

    if (missingRequiredFields.length) {
      errors.push(
        `Missing required fields: ${arrayToCommaSeparatedList(
          missingRequiredFields
        )}`
      );
    }

    const unsupportedFields = fields.filter(
      (field) =>
        !Object.values(PROMO_PAGE_CLASSIFICATIONS).includes(
          field.classification
        )
    );

    if (unsupportedFields.length) {
      errors.push(
        `Invalid field classifications: ${arrayToCommaSeparatedList(
          unsupportedFields.map((x) => x.classification)
        )}`
      );
    }

    const missingFieldIds = fields.filter(
      (field) => !field.classification && !field.fieldId
    );

    if (missingFieldIds.length) {
      errors.push(
        `Missing both classification and field id: ${arrayToCommaSeparatedList(
          missingFieldIds.map((field) => field.name)
        )} `
      );
    }

    for (const field of fields) {
      if ([PROMO_PAGE_CLASSIFICATIONS.Text].includes(field.classification)) {
        if (!field.files && !field.value) {
          errors.push(
            `${field.classification} is missing both file and text values.`
          );
        }
      } else {
        if (!field.value) {
          errors.push(`${field.classification} is missing text value.`);
        }
      }
    }

    return errors;
  },
};
