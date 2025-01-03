import "dotenv/config";
import Fastify from "fastify";
import { mondayClient } from "./clients/mondayClient.js";
import { QueryLevel } from "monstaa/dist/types/types.js";
import { MondayWebHook } from "./types/mondayWebhook.js";
import { Item } from "monstaa/dist/classes/Item.js";
import { Group } from "monstaa/dist/classes/Group.js";
import { CAMPAIGN_NAME_REGEX } from "./constants/REGEXES.js";
import {
  PARAMETER_LEVEL,
  FRIENDLY_FIELD_NAMES,
  ROUND_TYPES,
  COLUMN_GROUP,
  CONFIGURATION_COLUMN_NAMES,
  EMPTY_SELECTS_ENUM,
  COMPLEX_OFFER_TYPES,
} from "./constants/INFRA.js";
import { addDays, getToday } from "./helpers/dateFunctions.js";
import { getItemsFromInfraMapping } from "./helpers/infraFunctions.js";
import { ConfigError } from "./errors/configError.js";
import { isInteger } from "./helpers/validatorFunctions.js";
import { ENV } from "./config/envs.js";
import {
  validateOfferBonuses,
  validateOfferParameters,
  validateOfferSegments,
} from "./validators/offerValidators.js";
import {
  BonusOfferItem,
  GetOfferResult,
  NonBonusOfferItem,
} from "./types/offerTypes.js";
import { validateParameter } from "./validators/parameterValidators.js";
import { validateCampaignItem } from "./validators/campaignValidators.js";
import { CampaignFields, Field } from "./types/campaignTypes.js";
import { ConfigItem, ConfigItemField } from "./types/configTypes.js";
import {
  validateCampaignConfigs,
  validateConfigItems,
} from "./validators/configValidators.js";
const fastify = Fastify({
  logger: true,
});

// Declare a route
fastify.get("/", async function handler(request, reply) {
  return { hello: "world" };
});

fastify.post("/import-campaign", async function handler(request, reply) {
  const webHook = request.body as MondayWebHook;
  //TODO: For persistence, save this to an SQL database

  try {
    await importCampaign(webHook);
  } catch (error) {
    console.error((error as Error).stack);
  }
  reply.code(200).send({ status: "ok" });
});

async function getThemeGroup(
  themeBID: string,
  groupName: string
): Promise<Group> {
  if (groupName === "Choose Theme") {
    throw new Error(`Theme field is empty.`);
  }
  const themeBoard = await mondayClient.getBoard(themeBID, {
    queryLevel: QueryLevel.Group,
  });
  if (themeBoard === null) {
    //TODO: Handle fail/error
    throw new Error(`Theme board not found.`);
  }

  const themeGroup = themeBoard.groups?.find(
    (group) => group.title === groupName
  );

  if (!themeGroup) {
    //TODO: Handle fail/error
    throw new Error(
      `Group name ${groupName} is not found in Board:${themeBID}.`
    );
  }

  await themeGroup.update({
    queryLevel: QueryLevel.Cell,
    subitemLevel: "none",
  });

  return themeGroup;
}

async function getOfferGroup(
  offerBID: string,
  groupName: string
): Promise<Group> {
  if (groupName === "Choose Offer") {
    //TODO: Handle fail/error
    throw new Error(`Offer field is empty.`);
  }
  const offerBoard = await mondayClient.getBoard(offerBID, {
    queryLevel: QueryLevel.Group,
  });

  if (offerBoard === null) {
    //TODO: Handle fail/error
    throw new Error(`Theme board not found.`);
  }

  const offerGroup = offerBoard.groups?.find(
    (group) => group.title === groupName
  );

  if (!offerGroup) {
    //TODO: Handle fail/error
    throw new Error(
      `Group name ${groupName} is not found in Board:${offerBID}.`
    );
  }

  await offerGroup!.update({
    queryLevel: QueryLevel.Cell,
    subitemLevel: "none",
  });

  return offerGroup;
}

//Fail means
export type ValidationResult<T = undefined, U = string[]> =
  | (T extends undefined
      ? {
          status: "success";
        }
      : {
          status: "success";
          data: T;
        })
  | {
      status: "fail";
      data: U;
    }
  | {
      status: "error";
      message: string;
    };

function validateRoundItem(
  roundFields: RoundFields,
  infraFFNtoCID: Record<string, Record<string, string>>
): ValidationResult<ValidatedRoundFields> {
  try {
    const errors: string[] = [];

    if (roundFields.name === undefined) {
      errors.push(`Round name is unconfigured.`);
    }
    if (roundFields.name === null || roundFields.name === "") {
      errors.push(`Round name is blank or missing.`);
    }

    if (roundFields.roundType === undefined) {
      errors.push(`Round type is unconfigured.`);
    }
    if (
      roundFields.roundType !== undefined &&
      (roundFields.roundType === null ||
        !Object.values(ROUND_TYPES).includes(roundFields.roundType))
    ) {
      errors.push(`Round type is missing.`);
    }

    if (roundFields.startDate === undefined) {
      errors.push(`Round start date is unconfigured.`);
    }
    if (roundFields.startDate === null) {
      errors.push(`Round start date is missing.`);
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
    return errors.length
      ? {
          status: "fail",
          data: errors,
        }
      : {
          status: "success",
          data: roundFields as ValidatedRoundFields,
        };
  } catch (err) {
    return {
      status: "error",
      message: (err as Error).message,
    };
  }
}

interface RoundFields {
  name: Field<string>;
  roundType: Field<string>;
  startDate: Field<string>;
  endDate: Field<string>;
  emailScheduleHour: Field<string>;
  SMSScheduleHour: Field<string>;
  OMGScheduleHour: Field<string>;
  pushScheduleHour: Field<string>;
  isOneTime: Field<boolean>;
  tysonRound: Field<number>;
}
interface ValidatedRoundFields {
  name: string;
  roundType: "Intro" | "Reminder 1" | "Reminder 2";
  startDate: string;
  endDate: Field<string>;
  emailScheduleHour: Field<string>;
  SMSScheduleHour: Field<string>;
  OMGScheduleHour: Field<string>;
  pushScheduleHour: Field<string>;
  isOneTime: Field<boolean>;
  tysonRound: Field<number>;
}

//TODO: All missing/invalid config errors must show at the retrieval level
function getRoundFields(
  roundItem: Item,
  infraFFNtoCID: Record<string, Record<string, string>>
): RoundFields {
  const roundTypeCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Round_Type];
  const roundType = roundTypeCID
    ? (roundItem.values[roundTypeCID] as string)
    : undefined;

  const startDateCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Round_Start_Date];

  const startDate = startDateCID
    ? (roundItem.values[startDateCID] as string)
    : undefined;

  const endDateCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Round_End_Date];

  const endDate = endDateCID
    ? (roundItem.values[endDateCID] as string)
    : undefined;

  //If empty string, use the config board...
  const emailScheduleHourCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Email_Hour];

  const emailScheduleHour = emailScheduleHourCID
    ? (roundItem.values[emailScheduleHourCID] as string)
    : undefined;

  const SMSScheduleHourCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.SMS_Hour];

  const SMSScheduleHour = SMSScheduleHourCID
    ? (roundItem.values[SMSScheduleHourCID] as string)
    : undefined;

  const OMGScheduleHourCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.OMG_Hour];

  const OMGScheduleHour = OMGScheduleHourCID
    ? (roundItem.values[OMGScheduleHourCID] as string)
    : undefined;

  const pushScheduleHourCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Push_Hour];

  const pushScheduleHour = pushScheduleHourCID
    ? (roundItem.values[pushScheduleHourCID] as string)
    : undefined;

  const isOneTimeCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][
      FRIENDLY_FIELD_NAMES.Is_One_Time_Round
    ];

  const isOneTime = isOneTimeCID
    ? (roundItem.values[isOneTimeCID] as boolean)
    : undefined;

  const tysonRoundCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Tyson_Round_ID];

  const tysonRound = tysonRoundCID
    ? (roundItem.values[tysonRoundCID] as number)
    : undefined;

  return {
    name: roundItem.name,
    roundType,
    startDate,
    endDate,
    emailScheduleHour,
    SMSScheduleHour,
    OMGScheduleHour,
    pushScheduleHour,
    isOneTime,
    tysonRound,
  };
}

//NOTE: Here we retrieve values of the campaign itself and process it

//Undefined value for a field means two things -
//Either the CID is not declared in the Config Board,
//Or it is configured in board but the CID is not found in the actual board..
//For required configs, we handle both at the GET level, by throwing config error
async function getCampaignFields(
  campaignItem: Item,
  infraFFNtoCID: Record<string, Record<string, string>>,
  infraMapping: Record<string, Record<string, Item>>
): Promise<CampaignFields> {
  if (!campaignItem.cells) {
    throw new Error(`Campaign item is not initialized.`);
  }

  //IMPROVE: Maybe move config get to another function which takes items by FFNs...
  const missingConfigs: string[] = [];

  const dateRangeCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][
      FRIENDLY_FIELD_NAMES.Campaign_Date_Range
    ];
  const abCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.AB];

  const tiersCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Tiers];

  const statusCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][
      FRIENDLY_FIELD_NAMES.Campaign_Status
    ];

  const personCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Person];

  if (dateRangeCID === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Campaign_Date_Range);
  }
  if (statusCID === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Campaign_Status);
  }

  if (personCID === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Person);
  }

  if (missingConfigs.length) {
    throw new ConfigError("missing-configuration", missingConfigs);
  }

  const dateRange = campaignItem.values[dateRangeCID] as
    | [string, string]
    | undefined;

  const status = campaignItem.values[statusCID] as string | undefined;

  const personObject = campaignItem.cells[personCID].rawValue as
    | Record<string, any>
    | undefined;

  //Validate missing columns
  if (dateRange === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Campaign_Date_Range);
  }

  if (personObject === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Person);
  }

  if (status === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Campaign_Status);
  }

  if (missingConfigs.length) {
    throw new ConfigError("missing-column", missingConfigs);
  }
  const [startDate, endDate] = dateRange!;

  const ab = abCID ? (campaignItem.values[abCID] as number) : undefined;

  const tiers = tiersCID
    ? (campaignItem.values[tiersCID] as string[])
    : undefined;

  const controlGroupCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Control_Group];
  const controlGroup = controlGroupCID
    ? (campaignItem.values[controlGroupCID] as number)
    : undefined;

  const isOneTimeCampaignCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][
      FRIENDLY_FIELD_NAMES.Is_One_Time_Round
    ];
  const isOneTime = isOneTimeCampaignCID
    ? (campaignItem.values[isOneTimeCampaignCID] as boolean)
    : undefined;

  const allRegulations = getItemsFromInfraMapping(infraMapping, (item) => {
    return item.values[ENV.INFRA.CIDS.COLUMN_GROUP] === COLUMN_GROUP.Market;
  });

  const allMarketsCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.All_Markets];
  const allMarketsChecked = campaignItem.values[allMarketsCID] as boolean;

  const allPopFilters = getItemsFromInfraMapping(infraMapping, (item) => {
    return (
      item.values[ENV.INFRA.CIDS.COLUMN_GROUP] ===
      COLUMN_GROUP.Population_Filter
    );
  });

  const populationFilters: Record<
    string,
    {
      value: string;
      type: string;
    }
  > = {};
  for (let i = 0; i < allPopFilters.length; i++) {
    const popFilter = allPopFilters[i];

    const popFilterName = popFilter.values[ENV.INFRA.CIDS.FFN] as string;
    const popFilterCID = popFilter.values[ENV.INFRA.CIDS.COLUMN_ID] as string;
    const popFilterColType = popFilter.values[
      ENV.INFRA.CIDS.COLUMN_TYPE
    ] as string;

    const popFilterValue = campaignItem.values[popFilterCID] as string;
    populationFilters[popFilterName] = {
      value: popFilterValue,
      type: popFilterColType,
    };
  }

  const regulations: Record<string, boolean> = {};
  for (let i = 0; i < allRegulations.length; i++) {
    const regulation = allRegulations[i];
    const regulationName = regulation.values[ENV.INFRA.CIDS.FFN] as string;

    const regulationCID = regulation.values[ENV.INFRA.CIDS.COLUMN_ID] as string;

    const isRegulationChecked = Boolean(
      allMarketsChecked || campaignItem.values[regulationCID]
    );

    regulations[regulationName] = isRegulationChecked;
  }

  const user = await mondayClient.getUser(personObject!.personsAndTeams[0].id);

  const themeCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Theme];

  const theme = themeCID
    ? (campaignItem.values[themeCID] as string)
    : undefined;

  const offerCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Offer];

  const offer = offerCID
    ? (campaignItem.values[offerCID] as string)
    : undefined;

  return {
    name: campaignItem.name,
    startDate,
    endDate,
    ab,
    tiers,
    controlGroup,
    regulations,
    status: status!,
    user,
    theme,
    offer,
    isOneTime,
    populationFilters,
  };
}

function getBoardActionFlags(infraItem: Item) {
  //Maybe convert '_' to space and dynamically construct the return object
  return {
    "Import Parameters":
      infraItem.values[FRIENDLY_FIELD_NAMES.Import_Parameters] === true,
    "Connect Reminders":
      infraItem.values[FRIENDLY_FIELD_NAMES.Connect_Reminders] === true,
    "Cancel Rounds":
      infraItem.values[FRIENDLY_FIELD_NAMES.Cancel_Rounds] === true,
    "Delete Segments":
      infraItem.values[FRIENDLY_FIELD_NAMES.Delete_Segments] === true,
    "Didnt Deposit with Promocode":
      infraItem.values[FRIENDLY_FIELD_NAMES.Didnt_Deposit_with_Promocode] ===
      true,
    "Is One Time": infraItem.values[FRIENDLY_FIELD_NAMES.Is_One_Time] === true,
    "Exclude Default Parameters":
      infraItem.values[FRIENDLY_FIELD_NAMES.Exclude_Default_Parameters] ===
      true,
  };
}

function validateThemeItems(
  themeItems: ThemeParameter[]
): ValidationResult<ThemeParameter[], Record<string, string[]>> {
  try {
    const errors: Record<string, string[]> = {};
    for (const themeItem of themeItems) {
      const name = themeItem.parameterName;
      const paramErrors = validateParameter(themeItem);
      if (paramErrors.length) {
        errors[name] = [...paramErrors];
      }
    }

    return Object.keys(errors).length
      ? {
          status: "fail",
          data: errors,
        }
      : {
          status: "success",
          data: themeItems,
        };
  } catch (err) {
    return {
      status: "error",
      message: (err as Error).message,
    };
  }
}

async function getConfigGroup(configBID: string, groupName: string) {
  if (groupName === "Choose Offer") {
    throw new Error(`Offer field is empty.`);
  }
  const configBoard = await mondayClient.getBoard(configBID, {
    queryLevel: QueryLevel.Group,
  });

  if (configBoard === null) {
    throw new Error(`Config board not found.`);
  }

  const configGroup = configBoard.groups?.find(
    (group) => group.title === groupName
  );

  if (!configGroup) {
    throw new Error(
      `Group name ${groupName} is not found in Board:${configBID}.`
    );
  }

  await configGroup.update({
    queryLevel: QueryLevel.Cell,
    subitemLevel: QueryLevel.Cell,
  });

  return configGroup;
}

function processRoundItems(
  roundItems: Item[],
  infraFFNtoCID: Record<string, Record<string, string>>
): ValidationResult<
  Record<string, ValidatedRoundFields>,
  Record<string, string[]>
> {
  try {
    const roundErrors: Record<string, string[]> = {};
    const roundFieldsObj: Record<string, ValidatedRoundFields> = {};

    for (let i = 0; i < roundItems.length; i++) {
      const roundItem = roundItems[i];
      const roundFields = getRoundFields(roundItem, infraFFNtoCID);
      const validationResult = validateRoundItem(roundFields, infraFFNtoCID);
      if (validationResult.status === "error") {
        return validationResult;
      } else if (validationResult.status === "fail") {
        roundErrors[roundItem.name] = validationResult.data;
      } else {
        roundFieldsObj[roundItem.name] = validationResult.data;
      }
    }

    return Object.keys(roundErrors).length
      ? {
          status: "fail",
          data: roundErrors,
        }
      : {
          status: "success",
          data: roundFieldsObj,
        };
  } catch (err) {
    return {
      status: "error",
      message: (err as Error).message,
    };
  }
}

async function processCampaignItem(
  campaignItem: Item,
  infraFFNtoCID: Record<string, Record<string, string>>,
  infraMapping: Record<string, Record<string, Item>>
): Promise<ValidationResult<CampaignFields>> {
  try {
    const campaignFields = await getCampaignFields(
      campaignItem,
      infraFFNtoCID,
      infraMapping
    );
    const validationResult = validateCampaignItem(campaignFields);

    if (validationResult.status === "error") {
      return validationResult;
    } else if (validationResult.status === "fail") {
      return validationResult;
    } else {
      return {
        status: "success",
        data: campaignFields,
      };
    }
  } catch (err) {
    console.error((err as Error).stack);
    return {
      status: "error",
      message: (err as Error).message,
    };
  }
  //VALIDATION LAYER
}
interface ThemeParameter {
  parameterName: string;
  parameterType: string;
  communicationType: string;
  values: {
    [key: string]: string | null;
  };
}

//NOTE: Can throw error for not existing required config keys
function getThemeItems(
  themeGroup: Group,
  infraFFNtoCID: Record<string, Record<string, string>>,
  activeRegulations: Regulation[]
): ThemeParameter[] {
  const themeItems: ThemeParameter[] = [];

  const parameterTypeCID =
    infraFFNtoCID[PARAMETER_LEVEL.Theme][
      FRIENDLY_FIELD_NAMES.Theme_Parameter_Type
    ];
  const communicationTypeCID =
    infraFFNtoCID[PARAMETER_LEVEL.Theme][
      FRIENDLY_FIELD_NAMES.Theme_Communication_Type
    ];

  const missingConfigs: string[] = [];
  if (parameterTypeCID === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Theme_Parameter_Type);
  }
  if (communicationTypeCID === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Theme_Communication_Type);
  }

  if (missingConfigs.length) {
    throw new ConfigError("missing-configuration", missingConfigs);
  }
  //we loop over regulations and get the value.
  //value is null if reg name is not found
  for (let i = 0; i < themeGroup.items.length; i++) {
    const themeItem = themeGroup.items[i];
    const valuesObj: Record<string, string | null> = {};
    for (let i = 0; i < activeRegulations.length; i++) {
      const regulation = activeRegulations[i];
      const regulationName = regulation.name;

      //We look for cell with the same title as regulation name,
      //If we cant find it, we set a default value of null,
      //if yes we populate valuesObj with the value
      const cells = Object.values(themeItem.cells);
      const cell = cells.find((cell) => cell.title === regulationName);

      //We're treating columns that does not exist to be null
      //This is against our convention to set undefined to mean does not exist
      //and null for existing but empty value
      //The only reason is for legacy
      valuesObj[regulationName] = cell ? (cell.value as string) : null;
    }

    const parameterType = themeItem.values[parameterTypeCID] as string;
    const communicationType = themeItem.values[communicationTypeCID] as string;
    if (parameterType === undefined) {
      missingConfigs.push(FRIENDLY_FIELD_NAMES.Theme_Parameter_Type);
    }

    if (communicationType === undefined) {
      missingConfigs.push(FRIENDLY_FIELD_NAMES.Theme_Communication_Type);
    }

    //We can throw here because if it does not exist in one item in the for loop,
    //It does not exist for any item, no need to compile.
    if (missingConfigs.length) {
      throw new ConfigError("missing-column", missingConfigs);
    }

    themeItems.push({
      parameterName: themeItem.name,
      parameterType,
      communicationType,
      values: valuesObj,
    });
  }

  return themeItems;
}

async function getConfigItems(
  configGroup: Group,
  infraFFNtoCID: Record<string, Record<string, string>>,
  allRegulations: Regulation[]
): Promise<ConfigItem[]> {
  const activeRegulations = allRegulations
    .filter((reg) => reg.isChecked)
    .map((reg) => reg.name);

  const missingConfigs: string[] = [];
  const commTypeCID =
    infraFFNtoCID[PARAMETER_LEVEL.Configuration][
      FRIENDLY_FIELD_NAMES.Configuration_Type
    ];
  const commFieldCID =
    infraFFNtoCID[PARAMETER_LEVEL.Configuration][
      FRIENDLY_FIELD_NAMES.Configuration_Field
    ];
  const commRoundCID =
    infraFFNtoCID[PARAMETER_LEVEL.Configuration][
      FRIENDLY_FIELD_NAMES.Configuration_Round
    ];

  //TODO: Verify if these are all required..
  if (!commTypeCID) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Configuration_Type);
  }

  if (!commFieldCID) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Configuration_Field);
  }

  if (!commRoundCID) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Configuration_Round);
  }

  if (missingConfigs.length) {
    throw new ConfigError("missing-configuration", missingConfigs);
  }

  if (configGroup.items.length === 0) {
    return [];
  }
  const configItems: ConfigItem[] = [];

  for (let i = 0; i < configGroup.items.length; i++) {
    const item = configGroup.items[i];

    const segments: Record<string, string> = {};
    const cells = Object.values(item.cells);

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (activeRegulations.includes(cell.title)) {
        segments[cell.title] = cell.value as string;
      }
    }

    //These fields can still be undefined if the column is not declared..
    const itemRound = item.values[commRoundCID] as string;
    const itemType = item.values[commTypeCID] as string;
    const itemField = item.values[commFieldCID] as string;

    if (itemRound === undefined) {
      missingConfigs.push(FRIENDLY_FIELD_NAMES.Configuration_Round);
    }
    if (itemType === undefined) {
      missingConfigs.push(FRIENDLY_FIELD_NAMES.Configuration_Type);
    }
    if (itemField === undefined) {
      missingConfigs.push(FRIENDLY_FIELD_NAMES.Configuration_Field);
    }

    if (missingConfigs.length) {
      throw new ConfigError("missing-column", missingConfigs);
    }

    //If item has no subitems, we add a partial config item without 'fields' field
    if (item.subitems.length === 0) {
      const configItem = {
        name: item.name,
        round: itemRound,
        type: itemType,
        fieldName: itemField,
        segments,
      };
      configItems.push(configItem);
      continue;
    }

    //Otherwise we handle the subitem values by comparing column titles
    const sBoardId = item.subitems[0].boardId;
    const sBoard = await mondayClient.getBoard(sBoardId, {
      includeColumns: true,
      queryLevel: QueryLevel.Board,
    });
    if (!sBoard) {
      throw new Error(`Subitem board is missing`);
    }

    const columns = sBoard.columns;

    const missingColumns = [];
    const classification = columns.find(
      (col) => col.title === CONFIGURATION_COLUMN_NAMES.Classification
    );
    const fieldId = columns.find(
      (col) => col.title === CONFIGURATION_COLUMN_NAMES.Field_Id
    );
    const files = columns.find(
      (col) => col.title === CONFIGURATION_COLUMN_NAMES.Files
    );
    const value = columns.find(
      (col) => col.title === CONFIGURATION_COLUMN_NAMES.Value
    );

    if (!classification) {
      missingColumns.push(CONFIGURATION_COLUMN_NAMES.Classification);
    }
    if (!fieldId) {
      missingColumns.push(CONFIGURATION_COLUMN_NAMES.Field_Id);
    }
    if (!value) {
      missingColumns.push(CONFIGURATION_COLUMN_NAMES.Value);
    }

    if (missingColumns.length) {
      throw new ConfigError("missing-column", missingColumns);
    }

    let fields: ConfigItemField[] = [];
    for (let j = 0; j < item.subitems.length; j++) {
      const subitem = item.subitems[j];

      if (!subitem.cells) {
        break;
      }
      const field: ConfigItemField = {
        name: subitem.name,
        classification: subitem.values[classification!.columnId] as string,
        fieldId: subitem.values[fieldId!.columnId] as string,
        value: subitem.values[value!.columnId] as string,
        //NOTE: For file columns .values return asset id.
        //We will still need to extract the asset url to access the file..
        files: files ? (subitem.values[files.columnId] as string) : undefined,
      };

      fields.push(field);
    }

    const configItem: ConfigItem = {
      name: item.name,
      round: itemRound,
      type: itemType,
      fieldName: itemField,
      fields,
      segments,
    };

    configItems.push(configItem);
  }

  return configItems;
}

function getOfferItems(
  offerGroup: Group,
  infraFFNtoCID: Record<string, Record<string, string>>,
  activeRegulations: Regulation[]
): GetOfferResult {
  const missingConfigs = [];
  const parameterTypeCID =
    infraFFNtoCID[PARAMETER_LEVEL.Offer][
      FRIENDLY_FIELD_NAMES.Offer_Parameter_Type
    ];
  const useAsComCID =
    infraFFNtoCID[PARAMETER_LEVEL.Offer][FRIENDLY_FIELD_NAMES.Use_as_Com];
  const bonusTypeCID =
    infraFFNtoCID[PARAMETER_LEVEL.Offer][FRIENDLY_FIELD_NAMES.Bonus_Type];
  const bonusFieldNameCID =
    infraFFNtoCID[PARAMETER_LEVEL.Offer][FRIENDLY_FIELD_NAMES.Bonus_Field_Name];

  if (!parameterTypeCID) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Offer_Parameter_Type);
  }
  if (!bonusTypeCID && bonusFieldNameCID) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Bonus_Type);
  }
  if (bonusTypeCID && !bonusFieldNameCID) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Bonus_Field_Name);
  }

  if (missingConfigs.length) {
    throw new ConfigError("missing-configuration", missingConfigs);
  }

  const isBonus = bonusTypeCID && bonusFieldNameCID;

  if (isBonus) {
    const offerItems: BonusOfferItem[] = [];
    for (let i = 0; i < offerGroup.items.length; i++) {
      const offerItem = offerGroup.items[i];
      const valuesObj: Record<string, string> = {};
      for (let i = 0; i < activeRegulations.length; i++) {
        const regulation = activeRegulations[i];
        const regulationName = regulation.name;

        const cell = Object.values(offerItem.cells).find(
          (cell) => cell.title === regulationName
        );

        //This happens if a market chosen in campaign and is in configuration,
        //but not declared on the boards or the cell id has mismatch
        if (!cell) {
          throw new ConfigError("missing-column", regulationName);
        }
        valuesObj[regulationName] = cell.value as string;
      }

      //NOTE: Only the checked markets are added here
      const bonusType = offerItem.values[bonusTypeCID] as string;
      offerItems.push({
        parameterName: offerItem.name,
        bonusFieldName: offerItem.values[bonusFieldNameCID] as string,
        bonusType,
        useAsCom: useAsComCID
          ? (offerItem.values[useAsComCID] as boolean)
          : undefined,
        parameterType: offerItem.values[parameterTypeCID] as string,
        values: valuesObj,
        isFragment: Object.keys(COMPLEX_OFFER_TYPES).includes(bonusType),
      });
    }
    return {
      isBonus: true,
      offers: offerItems,
    };
  } else {
    const offerItems: NonBonusOfferItem[] = [];
    for (let i = 0; i < offerGroup.items.length; i++) {
      const offerItem = offerGroup.items[i];
      const valuesObj: Record<string, string> = {};

      for (let i = 0; i < activeRegulations.length; i++) {
        const regulation = activeRegulations[i];
        const regulationName = regulation.name;

        const cell = Object.values(offerItem.cells).find(
          (cell) => cell.title === regulationName
        );
        if (!cell) {
          throw new ConfigError("missing-column", regulationName);
        }
        valuesObj[regulationName] = cell.value as string;
      }

      offerItems.push({
        parameterName: offerItem.name,
        bonusFieldName: undefined,
        bonusType: undefined,
        useAsCom: useAsComCID
          ? (offerItem.values[useAsComCID] as boolean)
          : undefined,
        parameterType: offerItem.values[parameterTypeCID] as string,
        values: valuesObj,
        isFragment: false,
      });
    }
    return {
      isBonus: false,
      offers: offerItems,
    };
  }
}

function processThemeGroup(
  themeGroup: Group,
  infraFFNtoCID: Record<string, Record<string, string>>,
  activeRegulations: Regulation[]
): ValidationResult<ThemeParameter[], Record<string, string[]>> {
  try {
    const themeItems = getThemeItems(
      themeGroup,
      infraFFNtoCID,
      activeRegulations
    );

    return validateThemeItems(themeItems);
  } catch (err) {
    return {
      status: "error",
      message: (err as Error).message,
    };
  }
}

function processOfferGroup(
  offerGroup: Group,
  infraFFNtoCID: Record<string, Record<string, string>>,
  activeRegulations: Regulation[]
): ValidationResult<
  BonusOfferItem[] | NonBonusOfferItem[],
  Record<string, string[]>
> {
  try {
    const { offers, isBonus } = getOfferItems(
      offerGroup,
      infraFFNtoCID,
      activeRegulations
    );

    const paramValidateResult = validateOfferParameters(offers);
    if (paramValidateResult.status !== "success") {
      return paramValidateResult;
    }

    //isBonus = is if bonus field name and bonus type exists in monday boards
    if (isBonus) {
      const offerValidateResult = validateOfferBonuses(offers);

      if (offerValidateResult.status !== "success") {
        return offerValidateResult;
      }
      //Validate offer items against each other
      const segmentValidateResult = validateOfferSegments(
        offerValidateResult.data
      );
      if (segmentValidateResult.status !== "success") {
        return segmentValidateResult;
      }

      return {
        status: "success",
        data: segmentValidateResult.data,
      };
    }

    return {
      status: "success",
      data: offers,
    };
  } catch (err) {
    return {
      status: "error",
      message: (err as Error).message,
    };
  }
}

async function processConfigGroup(
  configGroup: Group,
  infraFFNtoCID: Record<string, Record<string, string>>,
  allRegulations: Regulation[]
): Promise<
  ValidationResult<ConfigItem[], Record<string, string[]> | string[]>
> {
  try {
    const configItems = await getConfigItems(
      configGroup,
      infraFFNtoCID,
      allRegulations
    );

    const validationResult = validateConfigItems(configItems);

    if (validationResult.status !== "success") {
      return validationResult;
    }

    const validateCampaignResult = validateCampaignConfigs(
      validationResult.data
    );

    if (validateCampaignResult.status !== "success") {
      return validateCampaignResult;
    }

    return {
      status: "success",
      data: configItems,
    };
  } catch (err) {
    console.error((err as Error).stack);
    return {
      status: "error",
      message: (err as Error).message,
    };
  }
}

//The first part is RETRIEVAL it will capture a snapshot of
//Monday boards values and load it into the memory, after this retrieval,
//any user changes in monday boards will not be considered,
//and all the validations is made upon this snapshot
//After validation, we generate a campaign object and save it into a database
//This way, any user changes after the import flow will not be reflected in the handler
//also improving run time, we make sure that the handler is handling a valid campaign
//AND we are moving the validation layer of Monday entirely in Tuesday API
interface Regulation {
  name: string;
  isChecked: boolean;
}

function generateRegulations(
  regulations: Record<string, boolean>,
  tiersList: Field<string[]>,
  ab: Field<number>
): Regulation[] {
  //if tiers is undefined (not declared in infra boards)
  //we will just use the regulations as is.
  //if ab is empty (null) or not declared (undefined), 0 which is validation error, means we turn it off
  const allRegulations: Regulation[] = [];
  if (tiersList) {
    Object.keys(regulations).forEach((regulation) => {
      tiersList.forEach((tier) => {
        allRegulations.push({
          name: `${regulation} ${tier}`,
          isChecked: regulations[regulation],
        });
        if (ab) {
          allRegulations.push({
            name: `${regulation} ${tier}_B`,
            isChecked: regulations[regulation],
          });
        }
      });
    });
  } else {
    Object.keys(regulations).forEach((regulation) => {
      allRegulations.push({
        name: regulation,
        isChecked: regulations[regulation],
      });
      if (ab) {
        allRegulations.push({
          name: `${regulation}_B`,
          isChecked: regulations[regulation],
        });
      }
    });
  }

  return allRegulations;
}

async function getInfraBoard() {
  //Get cached record first

  //else if cache miss, use monstaa
  return mondayClient.getBoard(ENV.INFRA.BOARD_ID, {
    queryLevel: QueryLevel.Cell,
    subitemLevel: "none",
  });
}

async function importCampaign(webhook: MondayWebHook) {
  const campaignPID = Number(webhook.event.pulseId);
  const campaignBID = Number(webhook.event.boardId);

  const [infraBoard, campaignItem] = await Promise.all([
    getInfraBoard(),
    mondayClient.getItem(
      { itemId: campaignPID },
      { queryLevel: QueryLevel.Cell, subitemLevel: QueryLevel.Cell }
    ),
  ]);

  if (!infraBoard) {
    throw new Error(`Infra board not found.`);
  }
  if (!campaignItem) {
    throw new Error(`Campaign item not found.`);
  }

  const infraItem = infraBoard.items!.find(
    (item) =>
      Number(item.values![ENV.INFRA.ROOT_CIDS.CAMPAIGN_BOARD_ID]) ===
      campaignBID
  );

  if (!infraItem) {
    throw new Error(`Infra item not found.`);
  }

  if (!infraItem.cells) {
    throw new Error(`Infra items not initialized.`);
  }

  await infraItem.update({
    queryLevel: QueryLevel.Cell,
    subitemLevel: QueryLevel.Cell,
  });

  const infraFFNtoCID: Record<string, Record<string, string>> = {};
  const infraMapping: Record<string, Record<string, Item>> = {};
  infraItem?.subitems?.forEach((subitem) => {
    const FFN = subitem.values[ENV.INFRA.CIDS.FFN] as string;
    const columnGroup = subitem.values[
      ENV.INFRA.CIDS.PARAMETER_LEVEL
    ] as string;

    infraMapping[columnGroup] = infraMapping[columnGroup] || {};
    infraMapping[columnGroup][FFN] = subitem;
    infraFFNtoCID[columnGroup] = infraFFNtoCID[columnGroup] || {};
    infraFFNtoCID[columnGroup][FFN] = String(
      subitem.values[ENV.INFRA.CIDS.COLUMN_ID]
    );
  });

  const actionFlags = getBoardActionFlags(infraItem);

  const campaignDetails = await processCampaignItem(
    campaignItem,
    infraFFNtoCID,
    infraMapping
  );

  if (campaignDetails.status === "fail") {
    //TODO: generate report
    return;
  } else if (campaignDetails.status === "error") {
    //TODO: error handling here
    return;
  }

  const roundDetails = processRoundItems(campaignItem.subitems, infraFFNtoCID);

  const themeBID = infraItem.values[ENV.INFRA.ROOT_CIDS.THEME_BOARD_ID];
  const offerBID = infraItem.values[ENV.INFRA.ROOT_CIDS.OFFER_BOARD_ID];
  const configBID = infraItem.values[ENV.INFRA.ROOT_CIDS.CONFIG_BOARD_ID];

  const themeName = campaignDetails.data.theme;
  const offerName = campaignDetails.data.offer;

  if (!themeName || EMPTY_SELECTS_ENUM.Theme === themeName) {
    //TODO: Handle fail
  }

  if (!offerName || EMPTY_SELECTS_ENUM.Offer === offerName) {
    //TODO: Handle fail
  }

  const regulations = campaignDetails.data.regulations;
  const tiers = campaignDetails.data.tiers; //Comma-separated
  const ab = campaignDetails.data.ab;

  const allRegulations = generateRegulations(regulations, tiers, ab);
  const activeRegulations = allRegulations.filter(
    (regulation) => regulation.isChecked
  );

  const [themeGroup, offerGroup, configGroup] = await Promise.all([
    getThemeGroup(themeBID as string, themeName as string),
    getOfferGroup(offerBID as string, offerName as string),
    getConfigGroup(configBID as string, offerName as string),
  ]);

  const themeDetails = processThemeGroup(
    themeGroup,
    infraFFNtoCID,
    activeRegulations
  );

  const offerDetails = processOfferGroup(
    offerGroup,
    infraFFNtoCID,
    activeRegulations
  );

  const configDetails = await processConfigGroup(
    configGroup,
    infraFFNtoCID,
    allRegulations
  );

  if (
    themeDetails.status === "error" ||
    offerDetails.status === "error" ||
    roundDetails.status === "error"
  ) {
    //generate report
    return;
  } else if (
    themeDetails.status === "fail" ||
    offerDetails.status === "fail" ||
    roundDetails.status === "fail"
  ) {
    //error handling here
    return;
  }

  console.log(JSON.stringify(campaignDetails.data, null, 2));
  console.log(JSON.stringify(roundDetails.data, null, 2));
  console.log(JSON.stringify(themeDetails.data, null, 2));
  console.log(JSON.stringify(offerDetails.data, null, 2));
}

// Run the server!
try {
  await fastify.listen({ port: 6000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
