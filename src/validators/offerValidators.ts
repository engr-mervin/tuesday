import { BONUS_TYPES, OFFER_TYPES } from "../constants/INFRA";
import {
  isInteger,
  isIntegerInRange,
  isNumberInRange,
} from "../helpers/validatorFunctions";
import { ValidationResult } from "../server";
import { OfferItem } from "../types/offerTypes";
import { validateParameter } from "./parameterValidators";

//NOTE: Return null if valid or error message...
export const offerValidationRules: Record<
  string,
  (v: string, market: string, offerItem: OfferItem) => null | string
> = {
  [OFFER_TYPES.External_Plan_ID]: (
    value: string,
    market: string,
    offerItem: OfferItem
  ) => {
    if (value.length === 0 || !isInteger(value)) {
      return `Value must be a valid integer.`;
    }
    return null;
  },

  [OFFER_TYPES.Winning_Offering_Type]: (
    value: string,
    market: string,
    offerItem: OfferItem
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
    offerItem: OfferItem
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
    offerItem: OfferItem
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
    offerItem: OfferItem
  ) => {
    if (!isIntegerInRange(value, -1, 5)) {
      return `Value must be a positive integer up to 5 or -1`;
    }
    return null;
  },

  [OFFER_TYPES.Expiration_Date]: (
    value: string,
    market: string,
    offerItem: OfferItem
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
    offerItem: OfferItem
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

export function validateOfferItem(offerItem: OfferItem): string[] {
  const errors = [];
  //If bonus fields are defined, validate that it should not be empty
  if (
    offerItem.bonusFieldName !== undefined &&
    offerItem.bonusType !== undefined
  ) {
    if (offerItem.bonusFieldName === "") {
      errors.push(`Bonus field name missing.`);
    }
    if (offerItem.bonusType === "") {
      errors.push(`Bonus type missing.`);
    }
    if (errors.length) {
      return errors;
    }
    const validator = offerValidationRules[offerItem.bonusType];
    for (const market in offerItem.values) {
      const value = offerItem.values[market];
      if (value === null) {
        errors.push(`${market} value is missing.`);
        continue;
      }

      const error = validator(value, market, offerItem);
      if (error !== null) {
        errors.push(`${market} value is invalid: ${error}.`);
      }
    }
    return errors;
  }

  return [];
}

export function validateOfferItems(
  offerItems: OfferItem[]
): ValidationResult<undefined, Record<string, string[]>> {
  try {
    const errors: Record<string, string[]> = {};

    for (const offerItem of offerItems) {
      const name = offerItem.parameterName;
      const offerErrors = validateOfferItem(offerItem);
      const paramErrors = offerItem.useAsCom
        ? validateParameter(offerItem)
        : [];
      if (offerErrors.length || paramErrors.length) {
        errors[name] = [...offerErrors, ...paramErrors];
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

export function validateInterOfferItems(
  offerItems: OfferItem[]
): ValidationResult<undefined, Record<string, string[]>> {
  const errors: Record<string, string[]> = {};
  for (const offerItem of offerItems) {
    const itemErrors = [];
    const name = offerItem.parameterName;
  }
}

const offerInterValidationRules = {
  [OFFER_TYPES.Offer_Game_Group]: (
    offerItem: OfferItem,
    offerItems: OfferItem[]
  ) => {
    if (offerItem.bonusType === "Offer Game Group") {
      const offeringTypeOffer = offerItems.find(
        (item) =>
          item.bonusType &&
          [
            OFFER_TYPES.Bonus_Offer_Type,
            OFFER_TYPES.Winning_Offering_Type,
          ].includes(item.bonusType)
      );
      if (offeringTypeOffer === undefined) {
        return `Offer type record is required.`;
      }

      for (const market in offerItem.values) {
        const value = offeringTypeOffer.values[market];
        if (!value) {
          return `Offer type value is missing for ${market}`;
        }
        if (Number(value) !== 1 && Number(offerItem.values[market]) !== -1) {
          return `Offer game group is only available for Offer Type = 1 (Casino Only)`;
        }
      }
    }
  },
};
