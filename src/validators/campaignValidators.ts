import {
  CAMPAIGN_STATUSES,
  CLOSED_POPULATION_EXTENSIONS,
  CLOSED_POPULATION_OPTIONS,
  CONFIGURATION_TYPES,
  EMPTY_SELECTS_ENUM,
  LIMITS,
  POPULATION_FILTER_TYPES,
  POPULATION_FILTERS,
} from "../constants/infraConstants.js";
import { CAMPAIGN_NAME_REGEX } from "../constants/regexConstants.js";
import {
  addDays,
  getToday,
  stringYYYYMMDDToDate,
} from "../helpers/dateFunctions.js";
import {
  isCommaSeparatedList,
  isInteger,
  isIntegerInRange,
  isValidInvertedStringRange,
  isValidStringDateRange,
  isValidStringRange,
} from "../helpers/validatorFunctions.js";
import {
  ActionFlags,
  BaseParameter,
  CampaignFields,
  PopulationFilters,
  Regulation,
  ValidatedCampaignFields,
} from "../types/campaignTypes";
import { ValidatedConfigItem } from "../types/configTypes.js";
import { ErrorObject, ValidationResult } from "../types/generalTypes.js";
import {
  ValidatedBonusOfferItem,
  ValidatedNonBonusOfferItem,
} from "../types/offerTypes.js";
import { ValidatedRoundFields } from "../types/roundTypes.js";
import { ThemeParameter } from "../types/themeTypes.js";

function validatePromocodeParameters(
  parameters: BaseParameter[],
  promocodeConfigs: ValidatedConfigItem[],
  activeRegulations: Regulation[]
): ValidationResult<undefined, string[]> {
  const errors: string[] = [];
  //If promocode is defined, the parameters with 'PromoCode' type should have a value
  const promocodeParameters = parameters.filter(
    (parameter) => parameter.parameterType === "PromoCode"
  );

  if (promocodeParameters.length === 0) {
    errors.push(
      `Promocode Config is defined but promocode is missing in the offer board.`
    );
  }

  //NOTE: Because of validation in campaign items that it must have at least one active regulation,
  //The firstRegulation is guaranteed to exist
  const firstRegulation = activeRegulations[0];

  const parametersDefinedForFirstReg = promocodeParameters.every(
    (parameter) => parameter.values[firstRegulation.name]
  );

  if (!parametersDefinedForFirstReg) {
    errors.push(
      `Promocode parameters must be configured in the offer board for the first active regulation - ${firstRegulation}`
    );
  }

  const promocodeParameterNames = promocodeParameters.map(
    (parameter) => parameter.parameterName
  );
  //Check if all promocode Config exists in the promocode params
  for (const promocodeConfig of promocodeConfigs) {
    if (!promocodeParameterNames.includes(promocodeConfig.name)) {
      errors.push(
        `Promocode Config ${promocodeConfig.name} does not exist in the Offers board.`
      );
    }
  }

  return errors.length
    ? {
        status: "fail",
        data: errors,
      }
    : {
        status: "success",
      };
}

export function interValidation(
  campaignFields: ValidatedCampaignFields,
  roundFields: ValidatedRoundFields[],
  themeItems: ThemeParameter[],
  offerItems: ValidatedBonusOfferItem[] | ValidatedNonBonusOfferItem[],
  configItems: ValidatedConfigItem[],
  activeRegulations: Regulation[],
  actionFlags: ActionFlags
): ValidationResult<undefined, ErrorObject> {
  const promocodeConfigs = configItems.filter(
    (config) => config.fieldName === CONFIGURATION_TYPES.Promocode_Config
  );
  const errorObjects: ErrorObject[] = [];

  const allParams: BaseParameter[] = [...themeItems, ...offerItems];
  let promoCodeResult: ValidationResult<undefined, string[]>;
  if (promocodeConfigs.length) {
    promoCodeResult = validatePromocodeParameters(
      allParams,
      promocodeConfigs,
      activeRegulations
    );

    if (promoCodeResult.status === "fail") {
      errorObjects.push({
        name: "Promocode Config",
        errors: promoCodeResult.data,
      });
    }
  }

  if (actionFlags.Import_Parameters) {
    const paramErrors: string[] = [];
    if (allParams.length === 0) {
      paramErrors.push(
        `Import parameters is checked but campaign is missing parameters`
      );
    }

    if (allParams.length > LIMITS.Max_Params + 1) {
      //We're adding 1 for the AAAA record
      paramErrors.push(
        `Parameters exceed the maximum allowed number of parameters.`
      );
    }

    if (paramErrors.length) {
      errorObjects.push({
        name: "Import Parameters",
        errors: paramErrors,
      });
    }
  }

  if (actionFlags.Didnt_Deposit_With_Promocode) {
    const promocodeErrors: string[] = [];

    //TODO: Add validations for duplicated promcodes? and param types
    const promoParam = allParams.find(
      (param) => param.parameterType === "PromoCode"
    );

    const promoUseCountParam = allParams.find(
      (param) => param.parameterType === "PromoCodeUseCount"
    );

    if (!promoParam) {
      promocodeErrors.push(`
        Didn't Deposit with Promocode is checked but missing PromoCode parameter`);
    } else {
      for (const segment in promoParam.values) {
        if (!promoParam.values[segment]) {
          promocodeErrors.push(`${segment} is missing PromoCode value.`);
        }
      }
    }

    if (!promoUseCountParam) {
      promocodeErrors.push(`
        Didn't Deposit with Promocode is checked but missing PromoCodeUseCount parameter`);
    } else {
      for (const segment in promoUseCountParam.values) {
        const value = promoUseCountParam.values[segment];
        if (!value) {
          promocodeErrors.push(
            `${segment} is missing PromoCodeUseCount value.`
          );
        } else if (Number.isInteger(value)) {
          promocodeErrors.push(
            `${segment} PromoCodeUseCount's value is invalid.`
          );
        }
      }
    }

    if (promocodeErrors.length) {
      errorObjects.push({
        name: "Didn't Deposit with Promocode",
        errors: promocodeErrors,
      });
    }
  }

  //Validate start dates
  const campaignErrors: string[] = [];
  const campStartDate = stringYYYYMMDDToDate(campaignFields.startDate);
  const campEndDate = stringYYYYMMDDToDate(campaignFields.endDate);

  if (!campStartDate) {
    campaignErrors.push(
      `Failed converting campaign start date: ${campaignFields.startDate}`
    );
  }

  if (!campEndDate) {
    campaignErrors.push(
      `Failed converting campaign end date: ${campaignFields.endDate}`
    );
  }

  //TODO: Improve this
  if (campaignErrors.length) {
    errorObjects.push({
      name: "Campaign Dates",
      errors: campaignErrors,
    });
  } else {
    for (const round of roundFields) {
      const roundErrors: string[] = [];

      const isOneTime = campaignFields.isOneTime || round.isOneTime;
      if (!isOneTime && !round.endDate) {
        roundErrors.push(`Missing round end date.`);
      } else {
        const startDate = stringYYYYMMDDToDate(round.startDate);
        const endDate = isOneTime
          ? startDate
          : stringYYYYMMDDToDate(round.endDate!);

        if (!startDate) {
          roundErrors.push(`
          Failed converting round start date: ${round.startDate}`);
        }

        if (!endDate) {
          roundErrors.push(
            `Failed converting round end date: ${round.endDate}`
          );
        }

        if (
          startDate &&
          (startDate < campStartDate! || startDate > campEndDate!)
        ) {
          roundErrors.push(
            `Round start date must be between campaign dates range: ${round.startDate}`
          );
        }
        if (endDate && (endDate < campStartDate! || endDate > campEndDate!)) {
          roundErrors.push(
            `Round end date must be between campaign dates range: ${round.endDate}`
          );
        }
      }
    }
  }

  return errorObjects.length
    ? {
        status: "fail",
        data: {
          name: "Intervalidation",
          errors: errorObjects,
        },
      }
    : {
        status: "success",
      };
}

export function validatePopulationFilters(
  popFilters: PopulationFilters
): string[] {
  const errors: string[] = [];

  //Validate vendors existing if games is defined
  const casinoGames = popFilters[POPULATION_FILTERS.Cashback_Casino_Games];
  const casinoVendors = popFilters[POPULATION_FILTERS.Cashback_Casino_Vendors];

  if (casinoGames && !casinoVendors) {
    errors.push(`CashbackCasinoVendors is required to use CashbackCasinoGames`);
  }

  for (const popFilterKey in popFilters) {
    const popFilter = popFilters[popFilterKey];
    if (!(popFilterKey in Object.values(POPULATION_FILTERS))) {
      errors.push(`
        ${popFilterKey} is not a supported Population Filter.
        `);
      continue;
    }

    if (popFilterKey in POPULATION_FILTER_TYPES.Round_Based) {
      const isValidRange = isValidStringRange(popFilter.value);
      if (!isValidRange) {
        errors.push(`${popFilterKey} is not a valid range.`);
      }
    }

    if (popFilterKey in POPULATION_FILTER_TYPES.Last_Bet_Date) {
      //Last bet date is either MAX-MIN or Date1-Date2
      const isValidInvertedRange = isValidInvertedStringRange(
        popFilter.value,
        "-",
        (inp) => isIntegerInRange(inp, 0, 1095)
      );
      const isValidDateRange = isValidStringDateRange(popFilter.value);

      if (!isValidInvertedRange && !isValidDateRange) {
        errors.push(
          `${popFilterKey} is not a valid XXX-YYY (MAX-MIN integer) range or DD.MM.YYYY-DD.MM.YYYY range.`
        );
      }
    }

    if (POPULATION_FILTERS.Cashback_Casino_Vendors === popFilterKey) {
      const isValidList = isCommaSeparatedList(popFilter.value, (v) =>
        isIntegerInRange(v, 0)
      );
      if (!isValidList) {
        `${popFilterKey} is not a valid comma separated list of integers > 0`;
      }
    }
    if (POPULATION_FILTERS.Cashback_Casino_Games === popFilterKey) {
      const isValidList = isCommaSeparatedList(popFilter.value, (v) =>
        isIntegerInRange(v, 0)
      );
      if (!isValidList) {
        `${popFilterKey} is not a valid comma separated list of integers > 0`;
      }
    }
  }

  return errors;
}

export function validateCampaignItem(campaignFields: CampaignFields): string[] {
  const errors: string[] = [];

  if (
    !campaignFields.theme ||
    EMPTY_SELECTS_ENUM.Theme === campaignFields.theme
  ) {
    errors.push(`Campaign theme is either missing or invalid.`);
  }

  if (
    !campaignFields.offer ||
    EMPTY_SELECTS_ENUM.Offer === campaignFields.offer
  ) {
    errors.push(`Campaign offer is either missing or invalid.`);
  }

  if (!campaignFields.name) {
    errors.push(`Campaign name is not defined.`);
  } else if (CAMPAIGN_NAME_REGEX.test(campaignFields.name)) {
    errors.push(
      `Campaign name must not contain special characters. Name: ${campaignFields.name}`
    );
  }

  if (
    campaignFields.closedPopulation.type === CLOSED_POPULATION_OPTIONS.CSV &&
    campaignFields.closedPopulation.files !== undefined
  ) {
    //Validate assets to only have one value
    const files = campaignFields.closedPopulation.files;

    if (files.length === 0) {
      errors.push(`No files defined for closed population.`);
    } else if (files.length !== 1) {
      errors.push(`
        Closed population should only have one file.`);
    } else {
      const file = files[0];
      const splitString = file.name.split(".");
      const extension = splitString[splitString.length - 1];

      if (extension !== CLOSED_POPULATION_EXTENSIONS.CSV) {
        errors.push(`
          Closed population file format not accepted. Currently only CSV is accepted.`);
      }
    }
  }

  if (
    ![
      CAMPAIGN_STATUSES.Draft,
      CAMPAIGN_STATUSES.Ready_For_Tyson,
      CAMPAIGN_STATUSES.Error,
    ].includes(campaignFields.status)
  ) {
    errors.push(`Campaign status should be either draft/ready for tyson.`);
  }

  if (campaignFields.user === null) {
    errors.push(`Triggering user not found in directory.`);
  }

  if (!campaignFields.startDate || !campaignFields.endDate) {
    errors.push(`Campaign must have campaign start/end dates.`);
  } else {
    const today = getToday();
    const latestStartDate = addDays(today, 60);

    const startDateObj = new Date(campaignFields.startDate);
    const endDateObj = new Date(campaignFields.endDate);

    //Actual start will be 1 day in the future.
    startDateObj.setDate(startDateObj.getDate() + 1);

    if (startDateObj > latestStartDate) {
      errors.push(`Campaign start date needs to be within the next 60 days.`);
    }
    if (startDateObj < today) {
      errors.push(`Campaign start date cannot be in the past.`);
    }
    if (startDateObj.getTime() === endDateObj.getTime()) {
      errors.push(`Campaign must have campaign start/end dates.`);
    }
  }

  if (Object.keys(campaignFields.regulations).length === 0) {
    errors.push(`Campaign must have a regulation.`);
  }

  if (
    Object.values(campaignFields.regulations).filter((isChecked) => isChecked)
      .length === 0
  ) {
    errors.push(`Campaign has no chosen regulation.`);
  }

  //The basis for requiring tiers in a campaign is the
  //existence of tiersCID record in the infra item...

  //Optional
  if (campaignFields.tiers !== undefined) {
    //Trim() is not needed here because this is only validation
    if (!campaignFields.tiers || campaignFields.tiers.length === 0) {
      errors.push(`Campaign is missing tiers.`);
    }
  }

  if (campaignFields.ab !== undefined) {
    if (
      campaignFields.ab === null ||
      isNaN(campaignFields.ab) ||
      campaignFields.ab > 90 ||
      campaignFields.ab < 10
    ) {
      errors.push(`Campaign's A/B value must be between 10-90 (inclusive).`);
    }
  }

  if (campaignFields.controlGroup !== undefined) {
    //Allow 10-90 and also empty value (0)
    if (
      !isInteger(campaignFields.controlGroup) ||
      (campaignFields.controlGroup !== 0 &&
        (campaignFields.controlGroup < 10 || campaignFields.controlGroup > 90))
    ) {
      errors.push(
        `Campaign control group value must be an integer between 10-90 (inclusive) or 0.`
      );
    }
  }

  return errors;
}
