import { mondayClient } from "../clients/mondayClient";
import {
  CLASSIFICATION_TO_FIELD_ID,
  COMPLEX_OFFER_TYPES,
  CONFIG_CLASSIFICATION_TO_FIELD_ID,
  CONFIGURATION_TYPES,
  CONFIGURATION_TYPES_CONVERSION,
  FIELDS_OMG,
  META_CLASSIFICATION_TO_FIELD_ID,
  OFFER_FIELD_NAMES,
  OFFER_TYPES,
  OFFER_TYPES_CONVERSION,
  POPULATION_FILTER_TYPES,
  POPULATION_FILTERS,
  PROMOTION_PAGE_TYPES,
  PROMOTION_PAGE_VALUE_SOURCE,
} from "../constants/infraConstants";
import { groupBy } from "../helpers/arrayFunctions";
import {
  addDays,
  dateToYYYYMMDDString,
  stringYYYYMMDDToDate,
  timeObjectToString,
} from "../helpers/dateFunctions";
import {
  isInteger,
  isValidStringDateRange,
} from "../helpers/validatorFunctions";
import {
  ActionFlags,
  ClosedPopulation,
  Regulation,
  ValidatedCampaignFields,
  ValidatedPopulationFilters,
} from "../types/campaignTypes";
import { ValidatedConfigItem } from "../types/configTypes";
import { ValuesOf } from "../types/generalTypes";
import {
  ValidatedBonusOfferItem,
  ValidatedNonBonusOfferItem,
} from "../types/offerTypes";
import { ValidatedRoundFields } from "../types/roundTypes";
import { ThemeParameter } from "../types/themeTypes";
import {
  Bonuses,
  Communications,
  Details,
  DetailsData,
  Filter,
  NeptuneFields,
  NeptunePacmanFields,
  Parameter,
  PromotionPage,
  RoundObject,
} from "../types/tysonTypes";

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
        type: OFFER_TYPES_CONVERSION[
          group as keyof typeof OFFER_TYPES_CONVERSION
        ],
        name: group as keyof typeof OFFER_TYPES_CONVERSION,
        segments: [] as any,
      };

      for (const segment of Object.keys(offerItems[0].values)) {
        const segmentObj: Record<string, any> = {
          segmentName: segment,
          bonusValues: Object.fromEntries(
            offers.map((offer) => [
              offer.bonusFieldName,
              offer.bonusFieldName in
              [
                OFFER_FIELD_NAMES.Game_List,
                OFFER_FIELD_NAMES.Sport_Name,
                OFFER_FIELD_NAMES.Tournament_Name,
                OFFER_FIELD_NAMES.Event_ID,
              ]
                ? offer.values[segment] || null
                : offer.values[segment]?.split(","),
            ])
          ),
        };

        if (group in COMPLEX_OFFER_TYPES) {
          segmentObj.bonusFragment =
            COMPLEX_OFFER_TYPES[group as keyof typeof COMPLEX_OFFER_TYPES];
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
    },
  };
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

export async function createCampaignObject(
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

    const offerBonuses = offerItems.filter(
      (offerItem) => offerItem.bonusFieldName && offerItem.bonusType
    ) as ValidatedBonusOfferItem[];

    const definedPopFilters = Object.fromEntries(
      Object.entries(campaignFields.populationFilters).filter(
        ([_, popFilter]) => popFilter.value !== ""
      )
    );

    const commsObject = buildCommunications(roundItem, configItems);

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
      populationFilters: Object.keys(definedPopFilters).length
        ? buildPopulationFilters(definedPopFilters)
        : null,
      communications: Object.keys(commsObject).length ? commsObject : null,
    };

    rounds.push(round);
  }

  return {
    details,
    rounds,
    promotionPage: (await buildPromotionPage(configItems)),
    closedPopulation: buildClosedPop(campaignFields.closedPopulation),
  }
}


function buildPopulationFilters(
  popFilters: ValidatedPopulationFilters
): Filter[] {
  const processedFilters: Filter[] = [];
  for (const key in popFilters) {
    const filterKey = key as keyof typeof POPULATION_FILTERS;
    const popFilter = popFilters[filterKey];
    const name = POPULATION_FILTERS[filterKey];

    //3 cases for value, round_based, bet date and everything else
    let value;
    let type;

    if (filterKey in POPULATION_FILTER_TYPES.Last_Bet_Date) {
      const replacedString = popFilter!.value.replace(/\s/gm, "");
      [value, type] = extractLastBet(replacedString);
    } else if (filterKey in POPULATION_FILTER_TYPES.Round_Based) {
      value = popFilter!.value;
      type = popFilter!.type;
    } else {
      value = popFilter!.value.replace(/\s/gm, "");
      type = popFilter!.type;
    }

    processedFilters.push({
      name,
      value,
      type,
    });
  }

  return processedFilters;
}

function extractLastBet(inp: string): [string, string] {
  const [value1, value2] = inp.split("-").map((str) => str.trim());

  if (isInteger(value1) && isInteger(value2)) {
    return [inp, "Number"];
  }

  if (isValidStringDateRange(inp)) {
    return [inp, "Date"];
  }

  return ["", ""];
}

function buildCommunications(
  roundFields: ValidatedRoundFields,
  configItems: ValidatedConfigItem[]
): Communications {
  const communications: Communications = {};
  const configGroups = groupBy(configItems, (configItem) => configItem.type);
  for (const configType in configGroups) {
    const type = configType as ValuesOf<typeof CONFIGURATION_TYPES>;
    const items = configGroups[type];
    const roundItems = items.filter(
      (item) => item.round === roundFields.roundType
    );
    const itemMap: Record<string, ValidatedConfigItem> = {};
    const roundItemMap: Record<string, ValidatedConfigItem> = {};
    for (const item of items) {
      itemMap[item.fieldName] = item;
    }
    for (const roundItem of roundItems) {
      roundItemMap[roundItem.fieldName] = roundItem;
    }

    if (type === CONFIGURATION_TYPES.OMG) {
      const fieldKey = CONFIGURATION_TYPES_CONVERSION[type];
      for (const segment of Object.keys(items[0].segments)) {
        communications[fieldKey] = {
          [segment]: {
            omg_scheduleHour: roundFields.OMGScheduleHour
              ? timeObjectToString(roundFields.OMGScheduleHour)
              : roundItemMap.omg_scheduleHour?.segments[segment],
            omg_templateId: roundItemMap.omg_templateId?.segments[segment],
          },
        };
      }
    } else if (type === CONFIGURATION_TYPES.Banner) {
      const fieldKey = CONFIGURATION_TYPES_CONVERSION[type];
      for (const segment of Object.keys(items[0].segments)) {
        communications[fieldKey] = {
          [segment]: {
            banner_casinoId: roundItemMap.banner_casinoId?.segments[segment],
            banner_pokerId: roundItemMap.banner_pokerId?.segments[segment],
            banner_sportId: roundItemMap.banner_sportId?.segments[segment],
            banner_777Id: roundItemMap.banner_777Id?.segments[segment],
            banner_durationStartDay:
              roundItemMap.banner_durationStartDay?.segments[segment],
            banner_scheduleStartHour:
              roundItemMap.banner_scheduleStartHour?.segments[segment],
            banner_durationEndDay:
              roundItemMap.banner_durationEndDay?.segments[segment],
            banner_scheduleEndHour:
              roundItemMap.banner_scheduleEndHour?.segments[segment],
          },
        };
      }
    } else if (type === CONFIGURATION_TYPES.Email) {
      const fieldKey = CONFIGURATION_TYPES_CONVERSION[type];
      for (const segment of Object.keys(items[0].segments)) {
        communications[fieldKey] = {
          [segment]: {
            email_scheduleHour: roundFields.emailScheduleHour
              ? timeObjectToString(roundFields.emailScheduleHour)
              : roundItemMap.email_scheduleHour?.segments[segment],
            email_templateId: roundItemMap.email_templateId?.segments[segment],
          },
        };
      }
    } else if (type === CONFIGURATION_TYPES.Neptune) {
      const fieldKey = CONFIGURATION_TYPES_CONVERSION[type];
      for (const segment of Object.keys(items[0].segments)) {
        communications[fieldKey] = {
          [segment]: {
            neptune_id: roundItemMap.neptune_id?.segments[segment],
          },
        };
      }
    } else if (type === CONFIGURATION_TYPES.Neptune_Opt_In) {
      const fieldKey = CONFIGURATION_TYPES_CONVERSION[type];
      for (const segment of Object.keys(items[0].segments)) {
        communications[fieldKey] = {
          [segment]: {
            neptuneOptin_id: roundItemMap.neptuneOptin_id?.segments[segment],
          },
        };
      }
    } else if (type === CONFIGURATION_TYPES.Push) {
      const fieldKey = CONFIGURATION_TYPES_CONVERSION[type];
      for (const segment of Object.keys(items[0].segments)) {
        communications[fieldKey] = {
          [segment]: {
            push_scheduleHour: roundFields.pushScheduleHour
              ? timeObjectToString(roundFields.pushScheduleHour)
              : roundItemMap.push_scheduleHour?.segments[segment],
            push_templateId: roundItemMap.push_templateId?.segments[segment],
          },
        };
      }
    } else if (type === CONFIGURATION_TYPES.Remove_Neptune) {
      const fieldKey = CONFIGURATION_TYPES_CONVERSION[type];
      for (const segment of Object.keys(items[0].segments)) {
        communications[fieldKey] = {
          [segment]: {
            removeNeptune_id: roundItemMap.removeNeptune_id?.segments[segment],
          },
        };
      }
    } else if (type === CONFIGURATION_TYPES.SMS) {
      const fieldKey = CONFIGURATION_TYPES_CONVERSION[type];
      for (const segment of Object.keys(items[0].segments)) {
        communications[fieldKey] = {
          [segment]: {
            sms_scheduleHour: roundFields.SMSScheduleHour
              ? timeObjectToString(roundFields.SMSScheduleHour)
              : roundItemMap.sms_scheduleHour?.segments[segment],
            sms_templateId: roundItemMap.sms_templateId?.segments[segment],
          },
        };
      }
    } else if (type === CONFIGURATION_TYPES.Promocode_Config) {
      const fieldKey = CONFIGURATION_TYPES_CONVERSION[type];
      communications[fieldKey] = {
        promocodes: {},
      };
      for (const item of items) {
        communications[fieldKey].promocodes[item.name] = item.fields
          ? item.fields.map((field) => ({
              name: field.name,
              fieldKey: field.fieldId,
              value: field.value,
              classification: field.classification,
            }))
          : [];
      }
    } else if (type === CONFIGURATION_TYPES.Neptune_Config) {
      const fieldKey = CONFIGURATION_TYPES_CONVERSION[type];
      communications[fieldKey] = {
        neptunes: {},
      };
      for (const item of items) {
        communications[fieldKey].neptunes[item.name] = item.fields
          ? item.fields.map((field) => ({
              name: field.name,
              fieldKey: field.fieldId as NeptuneFields,
              value: field.value,
              classification: field.classification,
            }))
          : [];
      }
    } else if (type === CONFIGURATION_TYPES.Pacman_Config) {
      const fieldKey = CONFIGURATION_TYPES_CONVERSION[type];
      communications[fieldKey] = {
        pacmans: {},
      };
      for (const item of items) {
        communications[fieldKey].pacmans[item.name] = item.fields
          ? item.fields.map((field) => ({
              name: field.name,
              fieldKey: field.fieldId as NeptunePacmanFields,
              value: field.value,
              classification: field.classification,
            }))
          : [];
      }
    } else if (type === CONFIGURATION_TYPES.Neptune_Bind) {
      const fieldKey = CONFIGURATION_TYPES_CONVERSION[type];
      communications[fieldKey] = {};
      for (const segment of Object.keys(items[0].segments)) {
        communications[fieldKey][segment] = {
          neptuneId: items[0].segments[segment],
        };
      }
    } else if (type === CONFIGURATION_TYPES.Segment_Filter) {
      const fieldKey = CONFIGURATION_TYPES_CONVERSION[type];
      communications[fieldKey] = {};
      for (const segment of Object.keys(items[0].segments)) {
        communications[fieldKey][segment] = {
          cashbackBaseSum: itemMap.cashbackBaseSum?.segments[segment],
          cashbackTotalBetSeg: itemMap.cashbackTotalBetSeg?.segments[segment],
        };
      }
    }
  }

  return communications;
}

//TODO: Improve
async function buildPromotionPage(
  configItems: ValidatedConfigItem[]
): Promise<PromotionPage | null> {
  const promotionConfigs = configItems.filter(
    (config) => config.round === "Promotion Page"
  );

  if (promotionConfigs.length === 0) {
    return null;
  }
  const promotionPage: Record<string, any> = {
    components: [],
  };
  for (const promotionConfig of promotionConfigs) {
    if (promotionConfig.fields) {
      let type =
        PROMOTION_PAGE_TYPES[
          promotionConfig.type as keyof typeof PROMOTION_PAGE_TYPES
        ];
      const componentObj: Record<string, string> = {};
      for (const field of promotionConfig.fields) {
        let fieldId = field.fieldId;
        if (!fieldId) {
          if (promotionConfig.type === "Promotion Meta") {
            fieldId =
              META_CLASSIFICATION_TO_FIELD_ID[
                field.classification as keyof typeof META_CLASSIFICATION_TO_FIELD_ID
              ];
          } else if (promotionConfig.type === "Promotion Config") {
            fieldId =
              CONFIG_CLASSIFICATION_TO_FIELD_ID[
                field.classification as keyof typeof CONFIG_CLASSIFICATION_TO_FIELD_ID
              ];
          } else {
            fieldId =
              CLASSIFICATION_TO_FIELD_ID[
                field.classification as keyof typeof CLASSIFICATION_TO_FIELD_ID
              ];
          }
        }

        let value = field.value;
        const valueSource =
          PROMOTION_PAGE_VALUE_SOURCE[
            fieldId as keyof typeof PROMOTION_PAGE_VALUE_SOURCE
          ];

        //TODO: Add validation for file values
        if (
          (valueSource === "file" || valueSource === "file-first") &&
          field.files
        ) {
          value = `__FILE__${
            (await mondayClient.getAsset(field.files[0]))?.publicUrl || ""
          }`;
        }

        componentObj[fieldId] = value;
      }

      if (type === "meta") {
        promotionPage.meta = { ...componentObj };
      } else if (type === "config") {
        promotionPage.config = { ...componentObj };
      } else {
        promotionPage.components.push(componentObj);
      }
    }
  }
  return promotionPage as PromotionPage;
}

function buildClosedPop(closedPopulation: ClosedPopulation) {



}
