import "dotenv/config";
import Fastify from "fastify";
import { mondayClient } from "./clients/mondayClient.js";
import { QueryLevel } from "monstaa/dist/types/types.js";
import { MondayWebHook } from "./types/mondayWebhook.js";
import { Item } from "monstaa/dist/classes/Item.js";
import { Group } from "monstaa/dist/classes/Group.js";
import { CAMPAIGN_NAME_REGEX } from "./constants/REGEXES.js";
import {
  CAMPAIGN_STATUSES,
  COLUMN_GROUP,
  FRIENDLY_FIELD_NAMES,
  ROUND_TYPES,
} from "./constants/INFRA.js";
import { addDays, getToday } from "./helpers/dateFunctions.js";
import {
  getCIDFromInfraMapping,
  getItemFromInfraMapping,
  getItemsFromInfraMapping,
} from "./helpers/infraFunctions.js";
import { ConfigError } from "./errors/configError.js";
import { isInteger } from "./helpers/validatorFunctions.js";
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
  const themeGroups = await mondayClient.getBoard(themeBID, {
    queryLevel: QueryLevel.Group,
  });

  if (groupName === "Choose Theme") {
    throw new Error(`Theme field is empty.`);
  }

  const themeGroup = themeGroups.groups?.find(
    (group) => group.title === groupName
  );

  if (!themeGroup) {
    throw new Error(
      `Group name ${groupName} is not found in Board:${themeBID}.`
    );
  }

  await themeGroup!.update({
    queryLevel: QueryLevel.Cell,
    subitemLevel: "none",
  });

  return themeGroup;
}

async function getOfferGroup(
  offerBID: string,
  groupName: string
): Promise<Group> {
  const offerGroups = await mondayClient.getBoard(offerBID, {
    queryLevel: QueryLevel.Group,
  });

  if (groupName === "Choose Offer") {
    throw new Error(`Offer field is empty.`);
  }

  const offerGroup = offerGroups.groups?.find(
    (group) => group.title === groupName
  );

  if (!offerGroup) {
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

type ValidationResult<T = undefined, U = string[]> =
  | (T extends undefined
      ? {
          status: "success";
        }
      : {
          status: "success";
          result: T;
        })
  | {
      status: "error";
      errors: U;
    }
  | {
      status: "fail";
      message: string;
    };

function validateRoundItem(
  roundFields: RoundFields,
  infraFFNtoCID: Record<string, Record<string, string>>
): ValidationResult {
  try {
    const errors: string[] = [];

    if (
      !roundFields.roundType ||
      !Object.values(ROUND_TYPES).includes(roundFields.roundType)
    ) {
      errors.push(`Round type is missing.`);
    }

    if (roundFields.startDate === undefined) {
      throw new ConfigError("Round Start Date", "MISSING");
    }

    if (!roundFields.startDate) {
      errors.push(`Round start date is missing.`);
    }

    // Validate start date and end date based on is one time
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
          status: "error",
          errors,
        }
      : {
          status: "success",
        };
  } catch (err) {
    return {
      status: "fail",
      message: (err as Error).message,
    };
  }
}

type RawValue<T> = T | undefined | null;

interface CampaignFields {
  name: RawValue<string>;
  startDate: RawValue<string>;
  endDate: RawValue<string>;
  ab: RawValue<number>;
  tiers: RawValue<string>;
  controlGroup: RawValue<number>;
  regulations: Record<string, boolean>;
  status: RawValue<string>;
  personId: RawValue<string>;
  theme: RawValue<string>;
  offer: RawValue<string>;
}

interface RoundFields {
  name: RawValue<string>;
  roundType: RawValue<string>;
  startDate: RawValue<string>;
  endDate: RawValue<string>;
  emailScheduleHour: RawValue<string>;
  SMSScheduleHour: RawValue<string>;
  OMGScheduleHour: RawValue<string>;
  pushScheduleHour: RawValue<string>;
  isOneTime: RawValue<boolean>;
  tysonRound: RawValue<number>;
}

function getRoundFields(
  roundItem: Item,
  infraFFNtoCID: Record<string, Record<string, string>>,
  infraMapping: Record<string, Item>
): RoundFields {
  if (!roundItem.cells) {
    throw new Error(`Round item is not initialized.`);
  }

  const roundTypeCID =
    infraFFNtoCID[COLUMN_GROUP.Round][FRIENDLY_FIELD_NAMES.Round_Type];
  const roundType = roundTypeCID
    ? (roundItem.cells[roundTypeCID].value as string)
    : undefined;

  const startDateCID =
    infraFFNtoCID[COLUMN_GROUP.Round][FRIENDLY_FIELD_NAMES.Round_Start_Date];

  const startDate = startDateCID
    ? (roundItem.cells[startDateCID].value as string)
    : undefined;

  const endDateCID =
    infraFFNtoCID[COLUMN_GROUP.Round][FRIENDLY_FIELD_NAMES.Round_Start_Date];

  const endDate = endDateCID
    ? (roundItem.cells[endDateCID].value as string)
    : undefined;

  const emailScheduleHourCID =
    infraFFNtoCID[COLUMN_GROUP.Round][FRIENDLY_FIELD_NAMES.Round_Start_Date];

  const emailScheduleHour = emailScheduleHourCID
    ? (roundItem.cells[emailScheduleHourCID].value as string)
    : undefined;

  const SMSScheduleHourCID =
    infraFFNtoCID[COLUMN_GROUP.Round][FRIENDLY_FIELD_NAMES.Round_Start_Date];

  const SMSScheduleHour = SMSScheduleHourCID
    ? (roundItem.cells[SMSScheduleHourCID].value as string)
    : undefined;

  const OMGScheduleHourCID =
    infraFFNtoCID[COLUMN_GROUP.Round][FRIENDLY_FIELD_NAMES.Round_Start_Date];

  const OMGScheduleHour = OMGScheduleHourCID
    ? (roundItem.cells[OMGScheduleHourCID].value as string)
    : undefined;

  const pushScheduleHourCID =
    infraFFNtoCID[COLUMN_GROUP.Round][FRIENDLY_FIELD_NAMES.Round_Start_Date];

  const pushScheduleHour = pushScheduleHourCID
    ? (roundItem.cells[pushScheduleHourCID].value as string)
    : undefined;

  const isOneTimeCID =
    infraFFNtoCID[COLUMN_GROUP.Round][FRIENDLY_FIELD_NAMES.Is_One_Time_Round];

  const isOneTime = isOneTimeCID
    ? (roundItem.cells[isOneTimeCID].value as boolean)
    : undefined;

  const tysonRoundCID =
    infraFFNtoCID[COLUMN_GROUP.Round][FRIENDLY_FIELD_NAMES.Is_One_Time_Round];

  const tysonRound = tysonRoundCID
    ? (roundItem.cells[tysonRoundCID].value as number)
    : undefined;

  //Validate undefined values

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
  //End round date can be null if is one time is checked, this will be in inter-validation
}

function getCampaignFields(
  campaignItem: Item,
  infraFFNtoCID: Record<string, Record<string, string>>,
  infraMapping: Record<string, Item>
): CampaignFields {
  if (!campaignItem.cells) {
    throw new Error(`Campaign item is not initialized.`);
  }

  const dateRangeCID =
    infraFFNtoCID[COLUMN_GROUP.Campaign][
      FRIENDLY_FIELD_NAMES.Campaign_Date_Range
    ];

  const [startDate, endDate] = dateRangeCID
    ? (campaignItem.cells[dateRangeCID].value as [string, string])
    : [undefined, undefined];

  const abCID = infraFFNtoCID[COLUMN_GROUP.Campaign][FRIENDLY_FIELD_NAMES.AB];
  const ab = abCID ? (campaignItem.cells[abCID].value as number) : undefined;

  const tiersCID =
    infraFFNtoCID[COLUMN_GROUP.Campaign][FRIENDLY_FIELD_NAMES.Tiers];
  const tiers = tiersCID
    ? (campaignItem.cells[tiersCID].value as string)
    : undefined;

  const controlGroupCID =
    infraFFNtoCID[COLUMN_GROUP.Campaign][FRIENDLY_FIELD_NAMES.Control_Group];
  const controlGroup = tiersCID
    ? (campaignItem.cells[controlGroupCID].value as number)
    : undefined;

  const allRegulations = getItemsFromInfraMapping(infraMapping, (item) => {
    return (
      item.cells![process.env.INFRA_CONFIG_COLUMN_GROUP_CID!].value ===
      COLUMN_GROUP.Market
    );
  });

  const allMarketsCID =
    infraFFNtoCID[COLUMN_GROUP.Campaign][FRIENDLY_FIELD_NAMES.All_Markets];

  const regulations: Record<string, boolean> = {};
  for (let i = 0; i < allRegulations.length; i++) {
    const regulation = allRegulations[i];
    const regulationName = regulation.cells![process.env.INFRA_CONFIG_FFN_CID!]
      .value as string;

    const regulationCID = regulation.cells![
      process.env.INFRA_CONFIG_COLUMN_GROUP_CID!
    ].value as string;

    const isRegulationChecked = Boolean(
      campaignItem.cells[allMarketsCID] ||
        campaignItem.cells![regulationCID].value
    );

    regulations[regulationName] = isRegulationChecked;
  }

  const statusCID =
    infraFFNtoCID[COLUMN_GROUP.Campaign][FRIENDLY_FIELD_NAMES.Campaign_Status];

  const status = statusCID
    ? (campaignItem.cells[statusCID].value as string)
    : undefined;

  const personCID =
    infraFFNtoCID[COLUMN_GROUP.Campaign][FRIENDLY_FIELD_NAMES.Person];

  const personId = personCID
    ? ((campaignItem.cells[personCID].rawValue as Record<string, any>)
        .personsAndTeams[0].id as string)
    : undefined;

  const themeCID =
    infraFFNtoCID[COLUMN_GROUP.Campaign][FRIENDLY_FIELD_NAMES.Theme];

  const theme = themeCID
    ? (campaignItem.cells[themeCID].value as string)
    : undefined;

  const offerCID =
    infraFFNtoCID[COLUMN_GROUP.Campaign][FRIENDLY_FIELD_NAMES.Offer];

  const offer = offerCID
    ? (campaignItem.cells[offerCID].value as string)
    : undefined;

  return {
    name: campaignItem.name,
    startDate,
    endDate,
    ab,
    tiers,
    controlGroup,
    regulations,
    status,
    personId,
    theme,
    offer,
  };
}

function validateCampaignItem(
  campaignFields: CampaignFields,
  infraFFNtoCID: Record<string, Record<string, string>>
): ValidationResult {
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

    //VALIDATE REGULATIONS AND TIERS
    //TODO: FOR DESIGN ERROR HANDLING
    if (Object.keys(campaignFields.regulations).length === 0) {
      errors.push(`Campaign must have a regulation.`);
    }

    //TODO: Move envs in a module with type safety

    //The basis for requiring tiers in a campaign is the
    //existence of tiersCID record in the infra item...
    //TODO: Not validation layer check!

    //Optional
    if (campaignFields.tiers !== undefined) {
      if (typeof campaignFields.tiers !== "string") {
        throw new ConfigError("Tiers", "INVALID");
      }

      const tiersList = campaignFields.tiers.split(",");
      if (tiersList.length === 0) {
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
          status: "error",
          errors,
        }
      : {
          status: "success",
        };
  } catch (err) {
    return {
      status: "fail",
      message: (err as Error).message,
    };
  }
}

async function getConfigGroup(configBID: string, groupName: string) {
  const configGroups = await mondayClient.getBoard(configBID, {
    queryLevel: QueryLevel.Group,
  });

  if (groupName === "Choose Offer") {
    throw new Error(`Offer field is empty.`);
  }

  const configGroup = configGroups.groups?.find(
    (group) => group.title === groupName
  );

  if (!configGroup) {
    throw new Error(
      `Group name ${groupName} is not found in Board:${configBID}.`
    );
  }

  await configGroup!.update({
    queryLevel: QueryLevel.Cell,
    subitemLevel: "none",
  });

  return configGroup;
}

function processRoundItems(
  roundItems: Item[] | undefined,
  infraFFNtoCID: Record<string, Record<string, string>>,
  infraMapping: Record<string, Item>
): ValidationResult<Record<string, RoundFields>, Record<string, string[]>> {
  try {
    const roundErrors: Record<string, string[]> = {};
    const roundFieldsObj: Record<string, RoundFields> = {};

    if (roundItems === undefined) {
      throw new Error(`Round items missing.`);
    }

    for (let i = 0; i < roundItems.length; i++) {
      const roundItem = roundItems[i];
      const roundFields = getRoundFields(
        roundItem,
        infraFFNtoCID,
        infraMapping
      );
      const result = validateRoundItem(roundFields, infraFFNtoCID);
      if (result.status === "fail") {
        return result;
      } else if (result.status === "error") {
        roundErrors[roundItem.name] = result.errors;
      } else {
        roundFieldsObj[roundItem.name] = roundFields;
      }
    }

    return Object.keys(roundErrors).length
      ? {
          status: "error",
          errors: roundErrors,
        }
      : {
          status: "success",
          result: roundFieldsObj,
        };
  } catch (err) {
    return {
      status: "fail",
      message: (err as Error).message,
    };
  }
}

function processCampaignItem(
  campaignItem: Item,
  infraFFNtoCID: Record<string, Record<string, string>>,
  infraMapping: Record<string, Item>
): ValidationResult<CampaignFields> {
  try {
    const campaignFields = getCampaignFields(
      campaignItem,
      infraFFNtoCID,
      infraMapping
    );
    const validationResult = validateCampaignItem(
      campaignFields,
      infraFFNtoCID
    );

    let campaignErrors: string[] = [];
    if (validationResult.status === "fail") {
      return validationResult;
    } else if (validationResult.status === "error") {
      campaignErrors = validationResult.errors;
    }

    return campaignErrors.length
      ? {
          status: "error",
          errors: campaignErrors,
        }
      : {
          status: "success",
          result: campaignFields,
        };
  } catch (err) {
    return {
      status: "fail",
      message: (err as Error).message,
    };
  }
  //VALIDATION LAYER
}

//The first part is RETRIEVAL it will capture a snapshot of
//Monday boards values and load it into the memory, after this retrieval,
//any user changes in monday boards will not be considered,
//and all the validations is made upon this snapshot
//After validation, we generate a campaign object and save it into a database
//This way, any user changes after the import flow will not be reflected in the handler
//also improving run time, AND we make sure that the handler is handling a valid campaign
//AND we are moving the validation layer of Monday entirely in Tuesday API
//COOL RIGHT?

async function importCampaign(webhook: MondayWebHook) {
  const campaignPID = Number(webhook.event.pulseId);
  const campaignBID = Number(webhook.event.boardId);
  const friendlyFieldNameCID = process.env.INFRA_CONFIG_FFN_CID!;
  const columnIDCID = process.env.INFRA_CONFIG_COLUMN_ID_CID!;
  const columnGroupCID = process.env.INFRA_CONFIG_COLUMN_GROUP_CID!;

  const [infraBoard, campaignItem] = await Promise.all([
    mondayClient.getBoard(process.env.INFRA_BOARD!, {
      queryLevel: QueryLevel.Cell,
      subitemLevel: "none",
    }),
    mondayClient.getItem(
      { itemId: campaignPID },
      { queryLevel: QueryLevel.Cell, subitemLevel: QueryLevel.Cell }
    ),
  ]);

  const infraItem = infraBoard.items!.find(
    (item) =>
      Number(item.cells![process.env.INFRA_CAMPAIGN_BOARD_ID_CID!].value) ===
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
  const infraMapping: Record<string, Item> = {};
  infraItem?.subitems?.forEach((subitem) => {
    const FFN = subitem.cells![friendlyFieldNameCID];
    const columnGroup = subitem.cells![columnGroupCID];

    infraMapping[String(FFN.value)] = subitem;
    infraFFNtoCID[String(columnGroup)] =
      infraFFNtoCID[String(columnGroup.value)] || {};
    infraFFNtoCID[String(columnGroup)][String(FFN.value)] = String(
      subitem.cells![String(columnIDCID)].value
    );
  });

  const campaignDetails = processCampaignItem(
    campaignItem,
    infraFFNtoCID,
    infraMapping
  );

  if (campaignDetails.status === "error") {
    //generate report
    return;
  } else if (campaignDetails.status === "fail") {
    //error handling here
    return;
  }

  const roundDetails = processRoundItems(
    campaignItem.subitems,
    infraFFNtoCID,
    infraMapping
  );

  //GET theme board id, offer board id, etc...
  const themeBID = infraItem.cells[process.env.INFRA_THEME_BOARD_ID_CID!].value;
  const offerBID = infraItem.cells[process.env.INFRA_OFFER_BOARD_ID_CID!].value;
  const configBID =
    infraItem.cells[process.env.INFRA_CONFIG_BOARD_ID_CID!].value;

  const themeName = campaignDetails.result.theme;
  const offerName = campaignDetails.result.offer;

  //TODO: Run in parallel
  //TODO: Add getuser in monsta
  //TODO: Query injection instead of multiple cases
  const themeGroup = await getThemeGroup(
    themeBID as string,
    themeName as string
  );
  const offerDetails = await getOfferGroup(
    offerBID as string,
    offerName as string
  );
  const configDetails = await getConfigGroup(
    configBID as string,
    offerName as string
  );
}

// Run the server!
try {
  await fastify.listen({ port: 6000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
