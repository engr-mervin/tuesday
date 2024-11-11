import "dotenv/config";
import Fastify from "fastify";
import { mondayClient } from "./clients/mondayClient.js";
import { QueryLevel } from "monstaa/dist/types/types.js";
import { CAMPAIGN_NAME_REGEX } from "./constants/REGEXES.js";
import { COLUMN_GROUP, FRIENDLY_FIELD_NAMES, ROUND_TYPES, } from "./constants/INFRA.js";
import { addDays, getToday } from "./helpers/dateFunctions.js";
import { getCIDFromInfraMapping, getItemsFromInfraMapping, } from "./helpers/infraFunctions.js";
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
    const webHook = request.body;
    //TODO: For persistence, save this to an SQL database
    try {
        await importCampaign(webHook);
    }
    catch (error) {
        console.error(error.stack);
    }
    reply.code(200).send({ status: "ok" });
});
async function processThemeBoard(themeBID, groupName) {
    const themeGroups = await mondayClient.getBoard(themeBID, {
        queryLevel: QueryLevel.Group,
    });
    if (groupName === "Choose Theme") {
        throw new Error(`Theme field is empty.`);
    }
    const themeGroup = themeGroups.groups?.find((group) => group.title === groupName);
    if (!themeGroup) {
        throw new Error(`Group name ${groupName} is not found in Board:${themeBID}.`);
    }
    await themeGroup.update({
        queryLevel: QueryLevel.Cell,
        subitemLevel: "none",
    });
    return themeGroup;
}
async function processOfferBoard(offerBID, groupName) {
    const offerGroups = await mondayClient.getBoard(offerBID, {
        queryLevel: QueryLevel.Group,
    });
    if (groupName === "Choose Offer") {
        throw new Error(`Offer field is empty.`);
    }
    const offerGroup = offerGroups.groups?.find((group) => group.title === groupName);
    if (!offerGroup) {
        throw new Error(`Group name ${groupName} is not found in Board:${offerBID}.`);
    }
    await offerGroup.update({
        queryLevel: QueryLevel.Cell,
        subitemLevel: "none",
    });
    return offerGroup;
}
function validateRoundItem(roundItem, infraCIDMapping, infraItemMapping) {
    if (!roundItem.cells) {
        throw new Error(`Round cells not initialized.`);
    }
    const errors = [];
    const roundTypeCID = getCIDFromInfraMapping(infraItemMapping, (item) => {
        return (item.cells[process.env.INFRA_CONFIG_FFN_CID].value ===
            FRIENDLY_FIELD_NAMES.Round_Type &&
            item.cells[process.env.INFRA_CONFIG_COLUMN_GROUP_CID].value ===
                COLUMN_GROUP.Round);
    });
    if (!roundTypeCID) {
        //
        throw new ConfigError("Round Type", "MISSING");
    }
    const roundType = roundItem.cells[roundTypeCID].value;
    if (!roundType || !Object.values(ROUND_TYPES).includes(roundType)) {
        errors.push(`Round type is missing.`);
    }
    const roundStartDateCID = getCIDFromInfraMapping(infraItemMapping, (item) => {
        return (item.cells[process.env.INFRA_CONFIG_FFN_CID].value ===
            FRIENDLY_FIELD_NAMES.Round_Start_Date &&
            item.cells[process.env.INFRA_CONFIG_COLUMN_GROUP_CID].value ===
                COLUMN_GROUP.Round);
    });
    if (!roundStartDateCID) {
        //
        throw new ConfigError("Round Start Date", "MISSING");
    }
    const roundStartDate = roundItem.cells[roundStartDateCID].value;
    if (!roundStartDate) {
        errors.push(`Round start date is missing.`);
    }
    //End round date can be null if is one time is checked, this will be in inter-validation
    const roundEndDateCID = getCIDFromInfraMapping(infraItemMapping, (item) => {
        return (item.cells[process.env.INFRA_CONFIG_FFN_CID].value ===
            FRIENDLY_FIELD_NAMES.Round_End_Date &&
            item.cells[process.env.INFRA_CONFIG_COLUMN_GROUP_CID].value ===
                COLUMN_GROUP.Round);
    });
    if (!roundEndDateCID) {
        //
        throw new ConfigError("Round End Date", "MISSING");
    }
    const roundEndDate = roundItem.cells[roundEndDateCID].value;
    if (!roundEndDate) {
        errors.push(`Round end date is missing.`);
    }
    //No need to validate because Monday field will always return a valid value
    const emailHourCID = getCIDFromInfraMapping(infraItemMapping, (item) => {
        return (item.cells[process.env.INFRA_CONFIG_FFN_CID].value ===
            FRIENDLY_FIELD_NAMES.Email_Hour &&
            item.cells[process.env.INFRA_CONFIG_COLUMN_GROUP_CID].value ===
                COLUMN_GROUP.Round);
    });
    const emailHour = emailHourCID ? roundItem.cells[emailHourCID] : null;
}
function getCampaignFields(campaignItem, infraColumnGroupCIDMapping, infraMapping) {
    if (!campaignItem.cells) {
        throw new Error(`Campaign item is missing.`);
    }
    const dateRangeCID = infraColumnGroupCIDMapping[COLUMN_GROUP.Campaign][FRIENDLY_FIELD_NAMES.Campaign_Date_Range];
    const [startDate, endDate] = dateRangeCID
        ? campaignItem.cells[dateRangeCID].value
        : [undefined, undefined];
    const abCID = infraColumnGroupCIDMapping[COLUMN_GROUP.Campaign][FRIENDLY_FIELD_NAMES.AB];
    const ab = abCID ? campaignItem.cells[abCID].value : undefined;
    const tiersCID = infraColumnGroupCIDMapping[COLUMN_GROUP.Campaign][FRIENDLY_FIELD_NAMES.Tiers];
    const tiers = tiersCID
        ? campaignItem.cells[tiersCID].value
        : undefined;
    const controlGroupCID = infraColumnGroupCIDMapping[COLUMN_GROUP.Campaign][FRIENDLY_FIELD_NAMES.Control_Group];
    const controlGroup = tiersCID
        ? campaignItem.cells[controlGroupCID].value
        : undefined;
    const allRegulations = getItemsFromInfraMapping(infraMapping, (item) => {
        return (item.cells[process.env.INFRA_CONFIG_COLUMN_GROUP_CID].value ===
            COLUMN_GROUP.Market);
    });
    const allMarketsCID = infraColumnGroupCIDMapping[COLUMN_GROUP.Campaign][FRIENDLY_FIELD_NAMES.All_Markets];
    const regulations = {};
    for (let i = 0; i < allRegulations.length; i++) {
        const regulation = allRegulations[i];
        const regulationName = regulation.cells[process.env.INFRA_CONFIG_FFN_CID]
            .value;
        const regulationCID = regulation.cells[process.env.INFRA_CONFIG_COLUMN_GROUP_CID].value;
        const isRegulationChecked = Boolean(campaignItem.cells[allMarketsCID] ||
            campaignItem.cells[regulationCID].value);
        regulations[regulationName] = isRegulationChecked;
    }
    return {
        name: campaignItem.name,
        startDate,
        endDate,
        ab,
        tiers,
        controlGroup,
        regulations,
    };
}
function validateCampaignItem(campaignFields, infraColumnGroupCIDMapping) {
    try {
        const errors = [];
        if (!campaignFields.name) {
            errors.push(`Campaign name is not defined.`);
        }
        else if (CAMPAIGN_NAME_REGEX.test(campaignFields.name)) {
            errors.push(`Campaign name must not contain special characters. Name: ${campaignFields.name}`);
        }
        //VALIDATE DATES
        if (!campaignFields.startDate || !campaignFields.endDate) {
            errors.push(`Campaign must have campaign start/end dates.`);
        }
        else {
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
        // const marketTiersList: { name: string; isChecked: boolean }[] = [];
        // let tiersList: string[] = [];
        // if (tiersCID) {
        //   //MONSTA: TODO: Move json.parse to cell class itself
        //   const tiersValue = campaignItem.cells[tiersCID].value;
        //   if (typeof tiersValue !== "string") {
        //     throw new ConfigError("Tiers", "INVALID");
        //   }
        //   //For verification, do we have boards where tiers are not required?
        //   tiersList = tiersValue.split(",");
        // }
        // const isABCID = infraCIDMapping[FRIENDLY_FIELD_NAMES.isAB]
        // const isAB = campaignItem.cells[isABCID].value as number | null;
        // //TODO: Monsta, better type inference
        // for (let i = 0; i < allRegulations.length; i++) {
        //   const regulation = allRegulations[i];
        //   const regulationName =
        //     regulation.cells![process.env.INFRA_CONFIG_FFN_CID!].value as string;
        //   const regulationCID = regulation.cells![process.env.INFRA_CONFIG_COLUMN_GROUP_CID!].value as string;
        //   const isRegulationChecked =
        //     Boolean(campaignItem.cells[allMarketsCID] ||
        //     campaignItem.cells![regulationCID].value);
        //   for (let j = 0; j < tiersList.length; j++) {
        //     const tier = tiersList[j];
        //     marketTiersList.push({
        //       name: `${regulationName} ${tier}`,
        //       isChecked: isRegulationChecked,
        //     })
        //     if(isAB !== null){
        //       marketTiersList.push({
        //         name: `${regulationName} ${tier}_B`,
        //         isChecked: isRegulationChecked,
        //       })
        //     }
        //   }
        // }
        //Optional
        if (campaignFields.tiers) {
            if (typeof campaignFields.tiers !== "string") {
                throw new ConfigError("Tiers", "INVALID");
            }
            const tiersList = campaignFields.tiers.split(",");
            if (tiersList.length === 0) {
                errors.push(`Campaign is missing tiers.`);
            }
        }
        if (campaignFields.ab) {
            if (isNaN(campaignFields.ab) ||
                campaignFields.ab > 90 ||
                campaignFields.ab < 10) {
                errors.push(`Campaign's A/B value must be between 10-90 (inclusive).`);
            }
        }
        if (campaignFields.controlGroup) {
            //Allow 10-90 and also empty value (0)
            if (!isInteger(campaignFields.controlGroup) ||
                (campaignFields.controlGroup !== 0 &&
                    (campaignFields.controlGroup < 10 ||
                        campaignFields.controlGroup > 90))) {
                errors.push(`Campaign control group value must be an integer between 10-90 (inclusive) or 0.`);
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
    }
    catch (err) {
        return {
            status: "fail",
            message: err.message,
        };
    }
}
async function processConfigBoard(configBID, groupName) { }
async function processCampaignItem(campaignItem, infraColumnGroupCIDMapping, infraMapping) {
    const campaignFields = getCampaignFields(campaignItem, infraColumnGroupCIDMapping, infraMapping);
    const validationResult = validateCampaignItem(campaignFields, infraColumnGroupCIDMapping);
    if (validationResult.status === "fail") {
        //generate report here
        return;
    }
    for (let i = 0; i < campaignItem.subitems.length; i++) {
        const roundItem = campaignItem.subitems[i];
        validateRoundItem(roundItem, infraCIDMapping, infraItemMapping);
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
async function importCampaign(webhook) {
    const campaignPID = Number(webhook.event.pulseId);
    const campaignBID = Number(webhook.event.boardId);
    const friendlyFieldNameCID = process.env.INFRA_CONFIG_FFN_CID;
    const columnIDCID = process.env.INFRA_CONFIG_COLUMN_ID_CID;
    const columnGroupCID = process.env.INFRA_CONFIG_COLUMN_GROUP_CID;
    const [infraBoard, campaignItem] = await Promise.all([
        mondayClient.getBoard(process.env.INFRA_BOARD, {
            queryLevel: QueryLevel.Cell,
            subitemLevel: "none",
        }),
        mondayClient.getItem({ itemId: campaignPID }, { queryLevel: QueryLevel.Cell, subitemLevel: QueryLevel.Cell }),
    ]);
    const infraItem = infraBoard.items.find((item) => Number(item.cells[process.env.INFRA_CAMPAIGN_BOARD_ID_CID].value) ===
        campaignBID);
    if (!infraItem) {
        throw new Error(`Infra item not found.`);
    }
    await infraItem.update({
        queryLevel: QueryLevel.Cell,
        subitemLevel: QueryLevel.Cell,
    });
    const infraColumnGroupCIDMapping = {};
    const infraMapping = {};
    infraItem?.subitems?.forEach((subitem) => {
        const FFN = subitem.cells[friendlyFieldNameCID];
        const columnGroup = subitem.cells[columnGroupCID];
        infraMapping[String(FFN.value)] = subitem;
        infraColumnGroupCIDMapping[String(columnGroup)] =
            infraColumnGroupCIDMapping[String(columnGroup.value)] || {};
        infraColumnGroupCIDMapping[String(columnGroup)][String(FFN.value)] = String(subitem.cells[String(columnIDCID)].value);
    });
    const campaignDetails = await processCampaignItem(campaignItem, infraColumnGroupCIDMapping, infraMapping);
    //GET theme board id, offer board id, etc...
    const themeBID = infraItem?.cells[process.env.INFRA_THEME_BOARD_ID_CID].value;
    const offerBID = infraItem?.cells[process.env.INFRA_OFFER_BOARD_ID_CID].value;
    const configBID = infraItem?.cells[process.env.INFRA_CONFIG_BOARD_ID_CID].value;
    //We will build a mapping like FFN value: Item in infra && FFN value: column id
    const themeName = campaignItem.cells[infraCIDMapping[FRIENDLY_FIELD_NAMES.Theme]].value;
    const offerName = campaignItem.cells[infraCIDMapping[FRIENDLY_FIELD_NAMES.Offer]].value;
    //Can be ran in parallel
    const themeDetails = await processThemeBoard(themeBID, themeName);
    const offerDetails = await processOfferBoard(offerBID, offerName);
    const configDetails = await processConfigBoard(configBID, offerName);
}
// Run the server!
try {
    await fastify.listen({ port: 6000 });
}
catch (err) {
    fastify.log.error(err);
    process.exit(1);
}
//# sourceMappingURL=server.js.map