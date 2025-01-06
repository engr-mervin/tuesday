import {
  CAMPAIGN_STATUSES,
  EMPTY_SELECTS_ENUM,
} from "../constants/infraConstants.js";
import { CAMPAIGN_NAME_REGEX } from "../constants/regexConstants.js";
import { addDays, getToday } from "../helpers/dateFunctions.js";
import { isInteger } from "../helpers/validatorFunctions.js";
import {
  CampaignFields,
  ValidatedCampaignFields,
} from "../types/campaignTypes";
import { ConfigItem, ValidatedConfigItem } from "../types/configTypes.js";
import { ValidationResult } from "../types/generalTypes.js";
import {
  BonusOfferItem,
  NonBonusOfferItem,
  ValidatedBonusOfferItem,
  ValidatedNonBonusOfferItem,
} from "../types/offerTypes.js";
import { ValidatedRoundFields } from "../types/roundTypes.js";
import { ThemeParameter } from "../types/themeTypes.js";

export function interValidation(
  campaignFields: ValidatedCampaignFields,
  roundFields: ValidatedRoundFields[],
  themeItems: ThemeParameter[],
  offerItems: ValidatedBonusOfferItem[] | ValidatedNonBonusOfferItem[],
  configItems: ValidatedConfigItem[]
): ValidationResult {
  return { status: "success" };
}

export function validateCampaignItem(
  campaignFields: CampaignFields
): ValidationResult<ValidatedCampaignFields> {
  const errors = [];

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

  return errors.length
    ? {
        status: "fail",
        data: [
          {
            name: "Campaign",
            errors,
          },
        ],
      }
    : {
        status: "success",
        data: campaignFields as ValidatedCampaignFields,
      };
}
