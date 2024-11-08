import "dotenv/config";
import Fastify from "fastify";
import { mondayClient } from "./clients/mondayClient.js";
import { QueryLevel } from "monstaa/dist/types/types.js";
import { CAMPAIGN_NAME_REGEX } from "./constants/REGEXES.js";
import { COLUMN_GROUP, FRIENDLY_FIELD_NAMES } from "./constants/INFRA.js";
import { addDays, getToday } from "./helpers/dateFunctions.js";
import { getItemFromInfraMapping, getItemsFromInfraMapping, } from "./helpers/infraFunctions.js";
import { ConfigError } from "./errors/configError.js";
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
function validateCampaignItem(campaignItem, infraCIDMapping, infraItemMapping) {
    try {
        const errors = [];
        //TODO: Improve
        if (!campaignItem.cells) {
            throw new Error(`Campaign item is missing.`);
        }
        const dateRangeCID = infraCIDMapping[FRIENDLY_FIELD_NAMES.Campaign_Date_Range];
        const [startDate, endDate] = campaignItem.cells[dateRangeCID].value;
        if (CAMPAIGN_NAME_REGEX.test(campaignItem.name)) {
            errors.push(`Campaign name must not contain special characters. Name: ${campaignItem.name}`);
        }
        //VALIDATE DATES
        if (startDate || endDate) {
            errors.push(`Campaign must have campaign start/end dates.`);
        }
        else {
            const today = getToday();
            const latestStartDate = addDays(today, 60);
            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);
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
        const allMarketsCID = infraCIDMapping[FRIENDLY_FIELD_NAMES.All_Markets];
        const allRegulations = getItemsFromInfraMapping(infraItemMapping, (item) => item.[process.env.INFRA_CONFIG_COLUMN_GROUP_CID].value ===
            COLUMN_GROUP.Markets);
        //FOR DESIGN ERROR HANDLING
        if (allRegulations.length === 0) {
            throw new ConfigError("Regulation", "MISSING");
        }
        const tiersItem = getItemFromInfraMapping(infraItemMapping, (item) => item.[process.env.INFRA_CONFIG_FFN_CID].value ===
            FRIENDLY_FIELD_NAMES.Tiers);
        if (!tiersItem) {
            throw new ConfigError("Tiers", "MISSING");
        }
        //TODO: Move envs in a module with type safety
        const tiersCID = tiersItem.cells[process.env.INFRA_CONFIG_FFN_CID].columnId;
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
        // const isAB = campaignItem.cells[isABCID].value;
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
        //     if(isAB){
        //       marketTiersList.push({
        //         name: `${regulationName} ${tier}_B`,
        //         isChecked: isRegulationChecked,
        //       })
        //     }
        //   }
        // }
        return errors.length
            ? {
                status: "error",
                errors,
            }
            : {
                status: "success",
            };
        //VALIDATE TIERS
    }
    catch (err) {
        return {
            status: "fail",
            message: err.message,
        };
    }
}
async function processConfigBoard(configBID, groupName) { }
async function processCampaignItem(campaignItem, infraCIDMapping, infraItemMapping) {
    const validationResult = validateCampaignItem(campaignItem, infraCIDMapping, infraItemMapping);
    //VALIDATION LAYER
}
async function importCampaign(webhook) {
    const campaignPID = Number(webhook.event.pulseId);
    const campaignBID = Number(webhook.event.boardId);
    const friendlyFieldNameCID = process.env.INFRA_CONFIG_FFN_CID;
    const columnIDCID = process.env.INFRA_CONFIG_COLUMN_ID_CID;
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
    const infraItemMapping = {};
    const infraCIDMapping = {};
    infraItem?.subitems?.forEach((subitem) => {
        const FFN = subitem.cells[friendlyFieldNameCID];
        infraItemMapping[String(FFN.value)] = subitem;
        infraCIDMapping[String(FFN.value)] = String(subitem.cells[String(columnIDCID)].value);
    });
    const campaignDetails = await processCampaignItem(campaignItem, infraCIDMapping, infraItemMapping);
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