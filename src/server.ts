import "dotenv/config";
import Fastify from "fastify";
import { mondayClient } from "./clients/mondayClient.js";
import { QueryLevel } from "monstaa/dist/types/types.js";
import { MondayWebHook } from "./types/mondayWebhook.js";
import { Item } from "monstaa/dist/classes/Item.js";
import { Group } from "monstaa/dist/classes/Group.js";
import {
  PARAMETER_LEVEL,
  FRIENDLY_FIELD_NAMES,
  COLUMN_GROUP,
  CONFIGURATION_COLUMN_NAMES,
  COMPLEX_OFFER_TYPES,
} from "./constants/infraConstants.js";
import { getItemsFromInfraMapping } from "./helpers/infraFunctions.js";
import { ConfigError } from "./errors/configError.js";
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
  ValidatedBonusOfferItem,
  ValidatedNonBonusOfferItem,
} from "./types/offerTypes.js";
import {
  interValidation,
  validateCampaignItem,
  validatePopulationFilters,
} from "./validators/campaignValidators.js";
import {
  ActionFlags,
  CampaignFields,
  Regulation,
  ValidatedCampaignFields,
} from "./types/campaignTypes.js";
import {
  ConfigItem,
  ConfigItemField,
  ValidatedConfigItem,
} from "./types/configTypes.js";
import {
  validateConfigGroup,
  validateConfigItems,
  validateConfigSegments,
} from "./validators/configValidators.js";
import {
  DateCellValue,
  DropdownCellValue,
  FileCellRawValue,
  FileCellValue,
  HourCellValue,
  NumberCellValue,
  TimelineCellValue,
} from "monstaa/dist/classes/Cell.js";
import { ThemeParameter } from "./types/themeTypes.js";
import { RoundFields, ValidatedRoundFields } from "./types/roundTypes.js";
import {
  validateCampaignRounds,
  validateRoundItems,
} from "./validators/roundValidators.js";
import {
  ErrorObject,
  FailedValidationResult,
  Optional,
  ValidationResult,
} from "./types/generalTypes.js";
import { InfraError } from "./classes/InfraError.js";
import { validateThemeItems } from "./validators/themeValidators.js";
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

fastify.post("/send-update", async function handler(request, reply) {
  //BR works
  //LI, OL, UL
  //H1-H6
  //PADDING FONTSIZE WORKS
  //BORDER DOES NOT
  //CAN USE IMG
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

function getRoundItems(
  roundItems: Item[],
  infraFFNtoCID: Record<string, Record<string, string>>
): RoundFields[] {
  const roundsObject: RoundFields[] = [];
  for (const roundItem of roundItems) {
    const roundFields = getRoundFields(roundItem, infraFFNtoCID);
    roundsObject.push(roundFields);
  }
  return roundsObject;
}
function getRoundFields(
  roundItem: Item,
  infraFFNtoCID: Record<string, Record<string, string>>
): RoundFields {
  const missingConfigs: string[] = [];
  const roundTypeCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Round_Type];

  const startDateCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Round_Start_Date];

  const endDateCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Round_End_Date];

  const tysonRoundCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Tyson_Round_ID];

  if (roundTypeCID === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Round_Type);
  }
  if (startDateCID === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Round_Start_Date);
  }
  if (endDateCID === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Round_End_Date);
  }
  if (tysonRoundCID === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Tyson_Round_ID);
  }

  if (missingConfigs.length) {
    throw new ConfigError("missing-configuration", missingConfigs);
  }

  const roundType = roundItem.values[roundTypeCID] as string;
  const startDate = roundItem.values[startDateCID] as DateCellValue;
  const endDate = roundItem.values[endDateCID] as DateCellValue;
  const tysonRound = roundItem.values[tysonRoundCID] as string;

  if (roundType === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Round_Type);
  }
  if (startDate === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Round_Start_Date);
  }
  if (endDate === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Round_End_Date);
  }
  if (tysonRound === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Tyson_Round_ID);
  }

  if (missingConfigs.length) {
    throw new ConfigError("missing-column", missingConfigs);
  }

  //If empty string, use the config board...
  const emailScheduleHourCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Email_Hour];

  const emailScheduleHour = emailScheduleHourCID
    ? (roundItem.values[emailScheduleHourCID] as HourCellValue)
    : undefined;

  const SMSScheduleHourCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.SMS_Hour];

  const SMSScheduleHour = SMSScheduleHourCID
    ? (roundItem.values[SMSScheduleHourCID] as HourCellValue)
    : undefined;

  const OMGScheduleHourCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.OMG_Hour];

  const OMGScheduleHour = OMGScheduleHourCID
    ? (roundItem.values[OMGScheduleHourCID] as HourCellValue)
    : undefined;

  const pushScheduleHourCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Push_Hour];

  const pushScheduleHour = pushScheduleHourCID
    ? (roundItem.values[pushScheduleHourCID] as HourCellValue)
    : undefined;

  const isOneTimeCID =
    infraFFNtoCID[PARAMETER_LEVEL.Round][
      FRIENDLY_FIELD_NAMES.Is_One_Time_Round
    ];

  const isOneTime = isOneTimeCID
    ? (roundItem.values[isOneTimeCID] as boolean)
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
  const statusCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][
      FRIENDLY_FIELD_NAMES.Campaign_Status
    ];

  const themeCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Theme];

  const offerCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Offer];

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

  if (offerCID === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Offer);
  }

  if (themeCID === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Theme);
  }

  if (missingConfigs.length) {
    throw new ConfigError("missing-configuration", missingConfigs);
  }

  const dateRange = campaignItem.values[dateRangeCID] as TimelineCellValue;
  const status = campaignItem.values[statusCID] as string;

  const personObject = campaignItem.cells[personCID].rawValue as
    | Record<string, any>
    | undefined;

  const theme = campaignItem.values[themeCID] as string;
  const offer = campaignItem.values[offerCID] as string;

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
  if (theme === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Theme);
  }
  if (offer === undefined) {
    missingConfigs.push(FRIENDLY_FIELD_NAMES.Offer);
  }

  if (missingConfigs.length) {
    throw new ConfigError("missing-column", missingConfigs);
  }
  const { from: startDate, to: endDate } = dateRange!;

  const abCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.AB];

  const ab = abCID
    ? (campaignItem.values[abCID] as NumberCellValue)
    : undefined;

  const tiersCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Tiers];

  const tiers = tiersCID
    ? (campaignItem.values[tiersCID] as DropdownCellValue)
    : undefined;

  const controlGroupCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Control_Group];

  const controlGroup = controlGroupCID
    ? (campaignItem.values[controlGroupCID] as NumberCellValue)
    : undefined;

  const isOneTimeCampaignCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][
      FRIENDLY_FIELD_NAMES.Is_One_Time_Round
    ];
  const isOneTime = isOneTimeCampaignCID
    ? (campaignItem.values[isOneTimeCampaignCID] as boolean)
    : undefined;

  const closedPopulationTypeCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][
      FRIENDLY_FIELD_NAMES.Closed_Population
    ];

  const closedPopulationType = closedPopulationTypeCID
    ? (campaignItem.values[closedPopulationTypeCID] as string)
    : undefined;

  const closedPopulationFileCID =
    infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Files];

  const closedPopulationCell = closedPopulationFileCID
    ? campaignItem.cells[closedPopulationFileCID]
    : undefined;

  const closedPopulationFiles = closedPopulationCell
    ? (closedPopulationCell.rawValue as FileCellRawValue)
    : undefined;

  const closedPopulation = {
    type: closedPopulationType,
    files: closedPopulationFiles
      ? closedPopulationFiles.files.map((file) => ({
          assetId: file.assetId,
          name: file.name,
        }))
      : undefined,
  };

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

    //TODO: Check if sunday uses FFN or column title for the name
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

  return {
    name: campaignItem.name,
    startDate,
    endDate,
    ab,
    tiers,
    controlGroup,
    regulations,
    status,
    user,
    theme,
    offer,
    isOneTime,
    populationFilters,
    closedPopulation,
  };
}

function getBoardActionFlags(infraItem: Item): ActionFlags {
  return {
    Import_Parameters:
      infraItem.values[FRIENDLY_FIELD_NAMES.Import_Parameters] === true,
    Connect_Reminders:
      infraItem.values[FRIENDLY_FIELD_NAMES.Connect_Reminders] === true,
    Cancel_Rounds:
      infraItem.values[FRIENDLY_FIELD_NAMES.Cancel_Rounds] === true,
    Delete_Segments:
      infraItem.values[FRIENDLY_FIELD_NAMES.Delete_Segments] === true,
    Didnt_Deposit_With_Promocode:
      infraItem.values[FRIENDLY_FIELD_NAMES.Didnt_Deposit_with_Promocode] ===
      true,
    Is_One_Time: infraItem.values[FRIENDLY_FIELD_NAMES.Is_One_Time] === true,
    Exclude_Default_Parameters:
      infraItem.values[FRIENDLY_FIELD_NAMES.Exclude_Default_Parameters] ===
      true,
  };
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
): ValidationResult<ValidatedRoundFields[]> {
  try {
    const roundsFields = getRoundItems(roundItems, infraFFNtoCID);

    const validateCampaignRoundsResult = validateCampaignRounds(roundsFields);

    if (validateCampaignRoundsResult.status !== "success") {
      return validateCampaignRoundsResult;
    }
    const validationResult = validateRoundItems(roundsFields);

    if (validationResult.status !== "success") {
      return validationResult;
    }

    return {
      status: "success",
      data: validationResult.data,
    };
  } catch (err) {
    throw new InfraError("Round", err as Error);
  }
}

async function processCampaignItem(
  campaignItem: Item,
  infraFFNtoCID: Record<string, Record<string, string>>,
  infraMapping: Record<string, Record<string, Item>>
): Promise<ValidationResult<ValidatedCampaignFields>> {
  try {
    const campaignFields = await getCampaignFields(
      campaignItem,
      infraFFNtoCID,
      infraMapping
    );
    const validationResult = validateCampaignItem(campaignFields);

    if (validationResult.status !== "success") {
      return validationResult;
    }

    const popValidationResult = validatePopulationFilters(
      campaignFields.populationFilters
    );

    if (popValidationResult.status !== "success") {
      return validationResult;
    }

    return {
      status: "success",
      data: campaignFields as ValidatedCampaignFields,
    };
  } catch (err) {
    throw new InfraError("Campaign", err as Error);
  }
  //VALIDATION LAYER
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
    const valuesObj: Record<string, string | undefined> = {};
    for (let i = 0; i < activeRegulations.length; i++) {
      const regulation = activeRegulations[i];
      const regulationName = regulation.name;

      //We look for cell with the same title as regulation name,
      //If we cant find it, we set a default value of null,
      //if yes we populate valuesObj with the value
      const cells = Object.values(themeItem.cells);
      const cell = cells.find((cell) => cell.title === regulationName);

      valuesObj[regulationName] = cell ? (cell.value as string) : undefined;
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
    const itemField = item.values[commFieldCID] as string[];

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
        fieldName: itemField[0],
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
        files: files
          ? (subitem.values[files.columnId] as FileCellValue)
          : undefined,
      };

      fields.push(field);
    }

    const configItem: ConfigItem = {
      name: item.name,
      round: itemRound,
      type: itemType,
      fieldName: itemField[0],
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
      const valuesObj: Record<string, string | undefined> = {};
      for (let i = 0; i < activeRegulations.length; i++) {
        const regulation = activeRegulations[i];
        const regulationName = regulation.name;

        const cell = Object.values(offerItem.cells).find(
          (cell) => cell.title === regulationName
        );

        //This happens if a market chosen in campaign and is in configuration,
        //but not declared on the boards or the cell id has mismatch
        //use undefined, handle appropriately on validators;
        valuesObj[regulationName] = cell ? (cell.value as string) : undefined;
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
          continue;
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
): ValidationResult<ThemeParameter[]> {
  try {
    const themeItems = getThemeItems(
      themeGroup,
      infraFFNtoCID,
      activeRegulations
    );

    const validationResult = validateThemeItems(themeItems);
    if (validationResult.status === "fail") {
      return {
        status: "fail",
        data: [
          {
            name: "Theme",
            errors: validationResult.data,
          },
        ],
      };
    }

    return validationResult;
  } catch (err) {
    throw new InfraError("Theme", err as Error);
  }
}

function processOfferGroup(
  offerGroup: Group,
  infraFFNtoCID: Record<string, Record<string, string>>,
  activeRegulations: Regulation[]
): ValidationResult<ValidatedBonusOfferItem[] | ValidatedNonBonusOfferItem[]> {
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
    throw new InfraError("Offer", err as Error);
  }
}

async function processConfigGroup(
  configGroup: Group,
  infraFFNtoCID: Record<string, Record<string, string>>,
  allRegulations: Regulation[]
): Promise<ValidationResult<ValidatedConfigItem[], ErrorObject[]>> {
  try {
    const configItems = await getConfigItems(
      configGroup,
      infraFFNtoCID,
      allRegulations
    );
    if (configItems.length === 0) {
      return {
        status: "success",
        data: [],
      };
    }

    const configErrors = validateConfigItems(configItems);

    if (configErrors.length > 0) {
      return {
        status: "fail",
        data: [
          {
            name: "Configuration",
            errors: configErrors,
          },
        ],
      };
    }

    const segmentErrors = validateConfigSegments(
      configItems as ValidatedConfigItem[]
    );

    if (segmentErrors.length > 0) {
      return {
        status: "fail",
        data: [
          {
            name: "Configuration Segments",
            errors: segmentErrors,
          },
        ],
      };
    }

    const configGroupErrors = validateConfigGroup(
      configItems as ValidatedConfigItem[]
    );

    if (configGroupErrors.length > 0) {
      return {
        status: "fail",
        data: [
          {
            name: "Configuration Group",
            errors: configErrors,
          },
        ],
      };
    }

    return {
      status: "success",
      data: configItems as ValidatedConfigItem[],
    };
  } catch (err) {
    throw new InfraError("Config", err as Error);
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

function generateErrorReportString(infraError: InfraError) {
  return `<ol><li><h4>${infraError.origin}</h4><ol><li><p>Encountered internal error while handling the request: ${infraError.id}</ol></li></p></li></ol>`;
}

function generateReportString(errorObjects: (ErrorObject | string)[]): string {
  let resultString = "";
  resultString += `<ol>`;
  for (const errorObject of errorObjects) {
    if (typeof errorObject === "string") {
      resultString += `<li><p>${errorObject}</p></li>`;
      continue;
    }
    resultString += `<li><h4>${errorObject.name}</h4></li>`;

    resultString += generateReportString(errorObject.errors);
  }
  resultString += `</ol>`;

  return resultString;
}

function generateRegulations(
  regulations: Record<string, boolean>,
  tiersList: Optional<DropdownCellValue>,
  ab: Optional<NumberCellValue>
): Regulation[] {
  //if tiers is undefined (not declared in infra boards)
  //we will just use the regulations as is.
  //if ab is empty (null) or not declared (undefined), 0 which is validation error, means we turn it off
  const allRegulations: Regulation[] = [];
  if (tiersList) {
    Object.keys(regulations).forEach((regulation) => {
      tiersList.forEach((tier) => {
        allRegulations.push({
          name: `${regulation.trim()} ${tier.trim()}`,
          isChecked: regulations[regulation],
        });
        if (ab) {
          //NOTE: If 0 then disable ab
          allRegulations.push({
            name: `${regulation.trim()} ${tier.trim()}_B`,
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

async function processError(
  err: unknown,
  defaultOrigin: string,
  itemId?: number
) {
  let infraError: InfraError;
  if (err instanceof InfraError) {
    infraError = err;
  } else if (err instanceof Error) {
    infraError = new InfraError(defaultOrigin, err);
  } else {
    const error = new Error(String(err));
    infraError = new InfraError(defaultOrigin, error);
  }

  const errorString = generateErrorReportString(infraError);

  if (itemId) {
    await mondayClient.writeUpdate(itemId, errorString);
  }

  //Log error
  console.error(
    `INFRA ERROR: ${infraError.id} - ${JSON.stringify({
      stack: infraError.baseError.stack,
      message: infraError.baseError.message,
    })}`
  );

  if (infraError.baseError instanceof ConfigError) {
    console.error(`
      CONFIG ERROR: ${
        infraError.baseError.name
      }: ${infraError.baseError.configNames.toString()}`);
  }
}

async function processFail(
  failedDetails: FailedValidationResult<ErrorObject[]>[],
  itemId: number
) {
  let reportString = ``;
  for (const details of failedDetails) {
    reportString += generateReportString(details.data);
  }
  await mondayClient.writeUpdate(itemId, reportString);
}

async function importCampaign(webhook: MondayWebHook) {
  let campaignPID;
  try {
    campaignPID = Number(webhook.event.pulseId);
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

    if (campaignDetails.status !== "success") {
      await processFail([campaignDetails], campaignPID);
      return;
    }

    const roundDetails = processRoundItems(
      campaignItem.subitems,
      infraFFNtoCID
    );

    const themeBID = infraItem.values[ENV.INFRA.ROOT_CIDS.THEME_BOARD_ID];
    const offerBID = infraItem.values[ENV.INFRA.ROOT_CIDS.OFFER_BOARD_ID];
    const configBID = infraItem.values[ENV.INFRA.ROOT_CIDS.CONFIG_BOARD_ID];

    const themeName = campaignDetails.data.theme;
    const offerName = campaignDetails.data.offer;

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

    const allDetails = [
      roundDetails,
      themeDetails,
      offerDetails,
      configDetails,
    ];

    if (
      roundDetails.status !== "success" ||
      themeDetails.status !== "success" ||
      offerDetails.status !== "success" ||
      configDetails.status !== "success"
    ) {
      const failedDetails = allDetails.filter(
        (details) => details.status !== "success"
      );
      await processFail(failedDetails, campaignPID);
      return;
    }

    const result = interValidation(
      campaignDetails.data,
      roundDetails.data,
      themeDetails.data,
      offerDetails.data,
      configDetails.data,
      activeRegulations,
      actionFlags
    );
  } catch (err) {
    await processError(err, "Import Campaign", campaignPID);
  }
}

try {
  await fastify.listen({ port: 6000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
