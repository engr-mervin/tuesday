import { COMPLEX_OFFER_TYPES, OFFER_FIELD_NAMES, OFFER_TYPES, OFFER_TYPES_CONVERSION } from "../constants/infraConstants";
import { groupBy } from "../helpers/arrayFunctions";
import { addDays, dateToYYYYMMDDString, stringYYYYMMDDToDate } from "../helpers/dateFunctions";
import { ActionFlags, Regulation, ValidatedCampaignFields } from "../types/campaignTypes";
import { ValidatedConfigItem } from "../types/configTypes";
import { ValidatedBonusOfferItem, ValidatedNonBonusOfferItem } from "../types/offerTypes";
import { ValidatedRoundFields } from "../types/roundTypes";
import { ThemeParameter } from "../types/themeTypes";
import { Bonuses, Details, DetailsData, Parameter, RoundObject } from "../types/tysonTypes";
import { Round } from "../validators/roundValidators";



function buildBonuses(offerItems: ValidatedBonusOfferItem[]): Bonuses {
  let list = [];
  if (offerItems.length) {
    const offerGrouped = groupBy(
      offerItems,
      (offerItem) => offerItem.bonusType
    );

    for (const group in Object.keys(offerGrouped)) {
      //group by first
      const offers = offerGrouped[group as keyof typeof offerGrouped];
      const groupObj = {
        type: OFFER_TYPES_CONVERSION[group as keyof typeof OFFER_TYPES_CONVERSION],
        name: group as keyof typeof OFFER_TYPES_CONVERSION,
        segments: [] as any,
      }

      for (const segment of Object.keys(offerItems[0].values)) {
        const segmentObj: Record<string, any> = {
          segmentName: segment,
          bonusValues: Object.fromEntries(offers.map(offer => [offer.bonusFieldName, offer.bonusFieldName in [OFFER_FIELD_NAMES.Game_List, OFFER_FIELD_NAMES.Sport_Name, OFFER_FIELD_NAMES.Tournament_Name, OFFER_FIELD_NAMES.Event_ID] ? (offer.values[segment] || null) : offer.values[segment]?.split(',')])),
        };

        if(group in COMPLEX_OFFER_TYPES){
            segmentObj.bonusFragment = COMPLEX_OFFER_TYPES[group as keyof typeof COMPLEX_OFFER_TYPES];
        }

        groupObj.segments.push(segmentObj);
      }

      list.push(groupObj);
    }
  }

  return {
    bonusesCnt: offerItems.length,
    list,
    //Since we're done with validations, this is empty
    validation: {
      message: [],
      hasError: false,
    }
  }
}


function buildParameters(
  roundType: string,
  offerParams: ValidatedBonusOfferItem[] | ValidatedNonBonusOfferItem[],
  themeParams: ThemeParameter[],
  allRegulations: Regulation[],
  actionFlags: ActionFlags,
  campStartDate: string,
  campEndDate: string
): Parameter[] {
  const params: Parameter[] = [];
  const regSegNums: Record<string, string> = {};

  for (let i = 0; i < allRegulations.length; i++) {
    const regulation = allRegulations[i];
    regSegNums[regulation.name] = `Segment Name${i + 1}`;
  }

  const headerParam: Parameter = {
    "Param Name": "AAAAA",
    "Param Type": "PRM_Type",
  };
  for (const regulation of allRegulations) {
    headerParam[regSegNums[regulation.name]] = regulation.name;
  }

  params.push(headerParam);

  for (const offerParam of offerParams) {
    if (offerParam.useAsCom) {
      const param: Parameter = {
        "Param Name": offerParam.parameterName,
        "Param Type": offerParam.parameterType,
      };

      for (const regulation of allRegulations) {
        param[regSegNums[regulation.name]] =
          offerParam.values[regulation.name] || null;
      }
      params.push(param);
    }
  }

  for (const themeParam of themeParams) {
    if (themeParam.communicationType === roundType) {
      const param: Parameter = {
        "Param Name": themeParam.parameterName,
        "Param Type": themeParam.parameterType,
      };

      for (const regulation of allRegulations) {
        param[regSegNums[regulation.name]] =
          themeParam.values[regulation.name] || null;
      }

      params.push(param);
    }
  }

  if (!actionFlags.Exclude_Default_Parameters) {
    const startParam: Parameter = {
      "Param Name": "PromotionStartDate",
      "Param Type": "Date (YYYY-MM-DD)",
    };

    const endParam: Parameter = {
      "Param Name": "PromotionEndDate",
      "Param Type": "Date (YYYY-MM-DD)",
    };

    for (const regulation of allRegulations) {
      startParam[regSegNums[regulation.name]] = campStartDate;
      endParam[regSegNums[regulation.name]] = campEndDate;
    }

    params.push(startParam);
    params.push(endParam);
  }

  return params;
}

export function createCampaignObject(
  offerName: string,
  themeName: string,
  campaignFields: ValidatedCampaignFields,
  roundFields: ValidatedRoundFields[],
  themeItems: ThemeParameter[],
  offerItems: ValidatedBonusOfferItem[] | ValidatedNonBonusOfferItem[],
  configItems: ValidatedConfigItem[],
  allRegulations: Regulation[],
  activeRegulations: Regulation[],
  actionFlags: ActionFlags
): DetailsData {
  const startDate = stringYYYYMMDDToDate(campaignFields.startDate) as Date;
  const startDateAdjusted = addDays(startDate, -1);
  const startDateString = dateToYYYYMMDDString(startDateAdjusted);

  const details: Details = {
    id: String(campaignFields.itemId),
    name: campaignFields.name,
    offer: offerName,
    theme: themeName,
    startDate: startDateString,
    endDate: campaignFields.endDate,
    status: campaignFields.status,
    ab: campaignFields.ab ?? null,
    controlGroup: String(campaignFields.controlGroup) ?? null,
    regulations: allRegulations,
    isOneTimeCampaign: campaignFields.isOneTime,
    tiers: {
      isRequired: campaignFields.tiers !== undefined,
      values: campaignFields.tiers ?? [],
      isValid:
        campaignFields.tiers !== undefined && campaignFields.tiers.length > 0,
    },
    personEmail: campaignFields.user.email,
  };

  const rounds: RoundObject[] = [];
  for (const roundItem of roundFields) {
    const roundStartDate = stringYYYYMMDDToDate(
      roundItem.roundType === "Intro"
        ? campaignFields.startDate
        : roundItem.startDate
    ) as Date;
    const roundStartDateAdjusted = addDays(roundStartDate, -1);
    const roundStartDateString = dateToYYYYMMDDString(roundStartDateAdjusted);


    const offerBonuses = offerItems.filter((offerItem) => offerItem.bonusFieldName && offerItem.bonusType) as ValidatedBonusOfferItem[];

    const definedPopFilters = Object.fromEntries(Object.entries(campaignFields.populationFilters).filter(([key, popFilter]) => popFilter.value !== ""));
    const round: RoundObject = {
      itemId: String(roundItem.itemId),
      name: roundItem.name,
      type: roundItem.roundType,
      startDate: roundStartDateString,
      endDate:
        campaignFields.isOneTime || roundItem.isOneTime
          ? roundStartDateString
          : (roundItem.endDate as string),
      isOneTimeRound: roundItem.isOneTime ?? false,
      parameters: buildParameters(
        roundItem.roundType,
        offerItems,
        themeItems,
        allRegulations,
        actionFlags,
        campaignFields.startDate,
        campaignFields.endDate
      ),
      bonuses: offerBonuses.length ? buildBonuses(offerBonuses) : null,
      populationFilters: Object.keys(definedPopFilters).length ? [] :null,
      communications: null, //TODO:
    };

    rounds.push(round);
  }
}