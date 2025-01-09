import { ROUND_TYPES } from "../constants/infraConstants.js";
import { ErrorObject, ValidationResult } from "../types/generalTypes.js";
import { RoundFields, ValidatedRoundFields } from "../types/roundTypes.js";

export type Round = (typeof ROUND_TYPES)[keyof typeof ROUND_TYPES];

export function validateCampaignRounds(
  roundsFields: RoundFields[]
): ValidationResult {
  const errors: string[] = [];

  if (roundsFields.length === 0) {
    errors.push(`Campaign is missing rounds.`);
  }

  const nameSet = new Set();
  for (const roundFields of roundsFields) {
    if (nameSet.has(roundFields.name)) {
      errors.push(`Round with name: ${roundFields.name} should be unique.`);
    }
    nameSet.add(roundFields.name);
  }

  const typeSet = new Set();
  for (const roundFields of roundsFields) {
    if (typeSet.has(roundFields.roundType)) {
      errors.push(
        `Round with type: ${roundFields.roundType} should be unique.`
      );
    }

    typeSet.add(roundFields.name);
  }

  if (!typeSet.has(ROUND_TYPES.Intro)) {
    errors.push(`Round should have an Intro Round.`);
  }

  return errors.length
    ? {
        status: "fail",
        data: [
          {
            name: "All",
            errors,
          },
        ],
      }
    : {
        status: "success",
      };
}

export function validateRoundItems(
  roundFieldsArr: RoundFields[]
): ValidationResult<ValidatedRoundFields[]> {
  const roundErrors: ErrorObject[] = [];
  for (const roundFields of roundFieldsArr) {
    const errors: string[] = [];

    if (roundFields.name === "") {
      errors.push(`Round name is blank or missing.`);
    }

    if (!Object.values(ROUND_TYPES).includes(roundFields.roundType as Round)) {
      errors.push(`Round type is invalid or missing.`);
    }

    if (roundFields.startDate === null) {
      errors.push(`Round start date is missing.`);
    }

    if (errors.length) {
      roundErrors.push({
        name: roundFields.name,
        errors,
      });
    }
  }

  // TODO: Validate start date and end date based on is one time
  // if (roundFields.startDate && roundFields.endDate){
  //   const start = new Date(roundFields.startDate);
  //   const end = new Date(roundFields.endDate);

  //   if(start > end){
  //     errors.push(`Round end date`)
  //   }
  // }

  //End round date can be null if is one time is checked, this will be in inter-campaign & round-validation

  //No need to validate omg,sms,push,email hours because Monday field will always return a valid value
  return roundErrors.length
    ? {
        status: "fail",
        data: roundErrors,
      }
    : {
        status: "success",
        data: roundFieldsArr as ValidatedRoundFields[],
      };
}
