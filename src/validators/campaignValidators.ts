import { CAMPAIGN_NAME_REGEX } from "../constants/REGEXES";
import { addDays, getToday } from "../helpers/dateFunctions";
import { isInteger } from "../helpers/validatorFunctions";
import { ValidationResult } from "../server";
import {
  CampaignFields,
  ValidatedCampaignFields,
} from "../types/campaignTypes";

export function validateCampaignItem(
  campaignFields: CampaignFields
): ValidationResult<ValidatedCampaignFields> {
  try {
    const errors = [];

    if (!campaignFields.name) {
      errors.push(`Campaign name is not defined.`);
    } else if (CAMPAIGN_NAME_REGEX.test(campaignFields.name)) {
      errors.push(
        `Campaign name must not contain special characters. Name: ${campaignFields.name}`
      );
    }

    //VALIDATE DATES
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

    //TODO: FOR DESIGN ERROR HANDLING
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
          (campaignFields.controlGroup < 10 ||
            campaignFields.controlGroup > 90))
      ) {
        errors.push(
          `Campaign control group value must be an integer between 10-90 (inclusive) or 0.`
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
          data: campaignFields as ValidatedCampaignFields,
        };
  } catch (err) {
    return {
      status: "error",
      message: (err as Error).message,
    };
  }
}
