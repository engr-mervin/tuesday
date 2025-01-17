import {
  BONUS_TYPES,
  OFFER_FIELD_NAMES,
  OFFER_TYPES,
} from "../constants/infraConstants.js";
import {
  isInteger,
  isIntegerInRange,
  isNumberInRange,
} from "../helpers/validatorFunctions.js";
import { ErrorObject } from "../types/generalTypes.js";
import {
  BonusOfferItem,
  NonBonusOfferItem,
  ValidatedBonusOfferItem,
} from "../types/offerTypes.js";
import { validateParameter } from "./parameterValidators.js";

//NOTE: Return null if valid or error message...
export const offerValidationRules: Record<
  string,
  (
    value: string | undefined,
    market: string,
    offerItem: BonusOfferItem
  ) => null | string
> = {
  [OFFER_FIELD_NAMES.External_Plan_ID]: (
    value: string | undefined,
    market: string,
    offerItem: BonusOfferItem
  ) => {
    if (value && (value.length === 0 || !isInteger(value))) {
      return `Value must be a valid integer.`;
    }
    return null;
  },

  [OFFER_FIELD_NAMES.Winning_Offering_Type]: (
    value: string | undefined,
    market: string,
    offerItem: BonusOfferItem
  ) => {
    if (value === undefined) {
      return null;
    }
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

  [OFFER_FIELD_NAMES.Bonus_Offer_Type]: (
    value: string | undefined,
    market: string,
    offerItem: BonusOfferItem
  ) => {
    if (value === undefined) {
      return null;
    }
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

  [OFFER_FIELD_NAMES.Offer_Game_Group]: (
    value: string | undefined,
    market: string,
    offerItem: BonusOfferItem
  ) => {
    if (value === undefined) {
      return null;
    }

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

  [OFFER_FIELD_NAMES.Offer_Package_ID]: (
    value: string | undefined,
    market: string,
    offerItem: BonusOfferItem
  ) => {
    if (value === undefined) {
      return null;
    }

    if (!isIntegerInRange(value, -1, 5)) {
      return `Value must be a positive integer up to 5 or -1`;
    }
    return null;
  },

  [OFFER_FIELD_NAMES.Expiration_Date]: (
    value: string | undefined,
    market: string,
    offerItem: BonusOfferItem
  ) => {
    if (value === undefined) {
      return null;
    }
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

  [OFFER_FIELD_NAMES.Number_of_Tickets]: (
    value: string | undefined,
    market: string,
    offerItem: BonusOfferItem
  ) => {
    if (value === undefined) {
      return null;
    }
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
  const errors: string[] = [];

  //NOTE: Offer board supports the existence of both bonus offer and non bonus offer
  //Non bonus offers are those with type 'Communication', we skip validation here.
  if(offerItem.bonusType === "Communication"){
    return []
  }

  //For the rest, bonusfield name should exist.
  if (offerItem.bonusFieldName === "") {
    return [`Bonus field name is required.`];
  }

  const validator = offerValidationRules[offerItem.bonusFieldName] || (() => null);
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
): ErrorObject[] {
  const errors: ErrorObject[] = [];

  for (const offerItem of offerItems) {
    const name = offerItem.parameterName;
    const paramErrors = offerItem.useAsCom ? validateParameter(offerItem) : [];
    if (paramErrors.length) {
      errors.push({
        name,
        errors: paramErrors,
      });
    }
  }
  return errors;
}

export function validateOfferBonuses(
  offerItems: BonusOfferItem[]
): ErrorObject[] {
  const errors: ErrorObject[] = [];

  for (const offerItem of offerItems) {
    const name = offerItem.parameterName;
    const offerErrors = validateBonus(offerItem);
    if (offerErrors.length) {
      errors.push({
        name,
        errors: offerErrors,
      });
    }
  }
  return errors;
}

export function validateOfferSegments(
  offerItems: ValidatedBonusOfferItem[]
): ErrorObject[] {
  const errors: ErrorObject[] = [];

  //First transform offerItems to a segment: bonus type: bonuses schema for easier validation..
  const segmentBonuses: {
    [key: string]: { [key: string]: string | undefined };
  } = {};

  for (const segment in offerItems[0].values) {
    const values: Record<string, string | undefined> = {};
    for (const offerItem of offerItems) {
      values[offerItem.bonusType] = offerItem.values[segment];
    }
    segmentBonuses[segment] = values;
  }

  const bonusTypesSet = new Set();
  for (const offerItem of offerItems) {
    if (bonusTypesSet.has(offerItem.bonusType)) {
      errors.push({
        name: "All",
        errors: [`Duplicate bonus ${offerItem.bonusType} found`],
      });
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

    const gameGroupValue = bonuses[OFFER_FIELD_NAMES.Offer_Game_Group];
    if (gameGroupValue !== undefined) {
      const offerTypeValue =
        bonuses[OFFER_FIELD_NAMES.Winning_Offering_Type] ||
        bonuses[OFFER_FIELD_NAMES.Bonus_Offer_Type];
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

    if (segmentErrors.length) {
      errors.push({
        name: segment,
        errors: segmentErrors,
      });
    }
  }

  return errors;
}
