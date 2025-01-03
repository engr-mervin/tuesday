import { BONUS_TYPES, OFFER_TYPES } from "../constants/INFRA";
import {
  isInteger,
  isIntegerInRange,
  isNumberInRange,
} from "../helpers/validatorFunctions";
import { ValidationResult } from "../server";
import {
  BonusOfferItem,
  NonBonusOfferItem,
  ValidatedBonusOfferItem,
} from "../types/offerTypes";
import { validateParameter } from "./parameterValidators";

//NOTE: Return null if valid or error message...
export const offerValidationRules: Record<
  string,
  (v: string, market: string, offerItem: BonusOfferItem) => null | string
> = {
  [OFFER_TYPES.External_Plan_ID]: (
    value: string,
    market: string,
    offerItem: BonusOfferItem
  ) => {
    if (value.length === 0 || !isInteger(value)) {
      return `Value must be a valid integer.`;
    }
    return null;
  },

  [OFFER_TYPES.Winning_Offering_Type]: (
    value: string,
    market: string,
    offerItem: BonusOfferItem
  ) => {
    if (isNumberInRange(value, 0)) {
      return `Value must be a positive integer or -1`;
    }

    if (
      offerItem.bonusType &&
      ![BONUS_TYPES.FPS, BONUS_TYPES.FPV].includes(offerItem.bonusType)
    ) {
      return `Value is only available for free play voucher and free play spin bonuses.`;
    }

    return null;
  },

  [OFFER_TYPES.Bonus_Offer_Type]: (
    value: string,
    market: string,
    offerItem: BonusOfferItem
  ) => {
    if (isNumberInRange(value, 0)) {
      return `Value must be a positive integer or -1`;
    }

    if (
      offerItem.bonusType &&
      ![BONUS_TYPES.FIM].includes(offerItem.bonusType)
    ) {
      return `Value is only available for immediate bonuses.`;
    }
    return null;
  },

  [OFFER_TYPES.Offer_Game_Group]: (
    value: string,
    market: string,
    offerItem: BonusOfferItem
  ) => {
    if (isNumberInRange(value, 0)) {
      return `Value must be a positive integer or -1`;
    }

    if (
      offerItem.bonusType &&
      ![BONUS_TYPES.FPS, BONUS_TYPES.FPV, BONUS_TYPES.FIM].includes(
        offerItem.bonusType
      )
    ) {
      return `Game group is only available for immediate, free play voucher and free play spin bonuses.`;
    }

    return null;
  },

  [OFFER_TYPES.Offer_Package_ID]: (
    value: string,
    market: string,
    offerItem: BonusOfferItem
  ) => {
    if (!isIntegerInRange(value, -1, 5)) {
      return `Value must be a positive integer up to 5 or -1`;
    }
    return null;
  },

  [OFFER_TYPES.Expiration_Date]: (
    value: string,
    market: string,
    offerItem: BonusOfferItem
  ) => {
    //Hierarchy of delimiters - [.] [/] [-]
    const delimiter = value.includes(".")
      ? "."
      : value.includes("/")
      ? "?"
      : value.includes("-")
      ? "-"
      : null;

    //TODO: Verify this
    if (!delimiter) {
      return null;
    }

    const dateArray = value.split(delimiter);

    const dateString =
      dateArray[0].length === 4
        ? `${dateArray[0]}-${dateArray[1]}-${dateArray[2]}`
        : `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}`;

    if (isNaN(new Date(dateString).getTime())) {
      return `Value must be in format DD-MM-YYY, DD.MM.YYYY or DD/MM/YYYY`;
    }

    return null;
  },

  [OFFER_TYPES.Number_of_Tickets]: (
    value: string,
    market: string,
    offerItem: BonusOfferItem
  ) => {
    const validNums = [1, 2, 3, 4, 5, 10];
    if (!isInteger(value)) {
      return `Value must be a valid integer`;
    }
    const numCast = Number(value);

    if (!validNums.includes(numCast)) {
      return `Value must be one of the ff: (1, 2, 3, 4, 5, 10)`;
    }

    return null;
  },
};

export function validateBonus(offerItem: BonusOfferItem): string[] {
  const errors = [];
  if (offerItem.bonusFieldName === "") {
    errors.push(`Bonus field name missing.`);
  }
  if (!Object.keys(OFFER_TYPES).includes(offerItem.bonusType)) {
    errors.push(`Bonus type not supported or missing.`);
  }
  if (errors.length) {
    return errors;
  }
  const validator = offerValidationRules[offerItem.bonusType];
  for (const market in offerItem.values) {
    const value = offerItem.values[market];

    const error = validator(value, market, offerItem);
    if (error !== null) {
      errors.push(`${market} value is invalid: ${error}.`);
    }
  }
  return errors;
}

export function validateOfferParameters(
  offerItems: BonusOfferItem[] | NonBonusOfferItem[]
): ValidationResult<undefined, Record<string, string[]>> {
  try {
    const errors: Record<string, string[]> = {};

    for (const offerItem of offerItems) {
      const name = offerItem.parameterName;
      const paramErrors = offerItem.useAsCom
        ? validateParameter(offerItem)
        : [];
      if (paramErrors.length) {
        errors[name] = paramErrors;
      }
    }
    return Object.keys(errors).length
      ? {
          status: "fail",
          data: errors,
        }
      : {
          status: "success",
        };
  } catch (err) {
    return {
      status: "error",
      message: (err as Error).message,
    };
  }
}

export function validateOfferBonuses(
  offerItems: BonusOfferItem[]
): ValidationResult<ValidatedBonusOfferItem[], Record<string, string[]>> {
  try {
    const errors: Record<string, string[]> = {};

    for (const offerItem of offerItems) {
      const name = offerItem.parameterName;
      const offerErrors = validateBonus(offerItem);
      if (offerErrors.length) {
        errors[name] = offerErrors;
      }
    }
    return Object.keys(errors).length
      ? {
          status: "fail",
          data: errors,
        }
      : {
          status: "success",
          data: offerItems as ValidatedBonusOfferItem[],
        };
  } catch (err) {
    return {
      status: "error",
      message: (err as Error).message,
    };
  }
}

export function validateOfferSegments(
  offerItems: ValidatedBonusOfferItem[]
): ValidationResult<ValidatedBonusOfferItem[], Record<string, string[]>> {
  const errors: Record<string, string[]> = {};

  //First transform offerItems to a segment: bonus type: bonuses schema for easier validation..
  const segmentBonuses: { [key: string]: { [key: string]: string | null } } =
    {};

  for (const segment in offerItems[0].values) {
    const values: Record<string, string | null> = {};
    for (const offerItem of offerItems) {
      values[offerItem.bonusType] = offerItem.values[segment];
    }
    segmentBonuses[segment] = values;
  }

  const bonusTypesSet = new Set();
  for(const offerItem of offerItems){
    if(bonusTypesSet.has(offerItem.bonusType)){
      errors.all = [`Duplicate bonus ${offerItem.bonusType} found`];
      continue;
    }
    bonusTypesSet.add(offerItem.bonusType);
  }

  for (const segment in segmentBonuses) {
    const segmentErrors = [];
    const bonuses = segmentBonuses[segment];
    const values = Object.values(segmentBonuses[segment]);
    if (
      values.some((bonus) => bonus === null) &&
      !values.every((bonus) => bonus === null)
    ) {
      segmentErrors.push(`Incomplete values in some bonuses.`);
    }

    const gameGroupValue = bonuses[OFFER_TYPES.Offer_Game_Group];
    if (gameGroupValue !== undefined) {
      const offerTypeValue = bonuses[OFFER_TYPES.Winning_Offering_Type] || bonuses[OFFER_TYPES.Bonus_Offer_Type];
      if (offerTypeValue === undefined) {
        segmentErrors.push(`Offer type record is required.`);
      } else {
        if (!offerTypeValue) {
          segmentErrors.push(`Offer type value is missing for ${segment}`);
        }
        if (Number(gameGroupValue) !== 1 && Number(offerTypeValue) !== -1) {
          segmentErrors.push(
            `Offer game group is only available for Offer Type = 1 (Casino Only)`
          );
        }
      }
    }

    errors[segment] = segmentErrors;
  }

  return errors.length
    ? {
        status: "success",
        data: offerItems,
      }
    : {
        status: "fail",
        data: errors,
      };
}

