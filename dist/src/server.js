import "dotenv/config";
import Fastify from "fastify";
import { mondayClient } from "./clients/mondayClient.js";
import { QueryLevel } from "monstaa/dist/types/types.js";
import { CAMPAIGN_NAME_REGEX } from "./constants/REGEXES.js";
import { PARAMETER_LEVEL, FRIENDLY_FIELD_NAMES, ROUND_TYPES, COLUMN_GROUP, CONFIGURATION_COLUMN_NAMES, } from "./constants/INFRA.js";
import { addDays, getToday } from "./helpers/dateFunctions.js";
import { getItemsFromInfraMapping, } from "./helpers/infraFunctions.js";
import { ConfigError } from "./errors/configError.js";
import { isInteger } from "./helpers/validatorFunctions.js";
import { ENV } from "./config/envs.js";
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
async function getThemeGroup(themeBID, groupName) {
    if (groupName === "Choose Theme") {
        throw new Error(`Theme field is empty.`);
    }
    const themeBoard = await mondayClient.getBoard(themeBID, {
        queryLevel: QueryLevel.Group,
    });
    if (themeBoard === null) {
        throw new Error(`Theme board not found.`);
    }
    const themeGroup = themeBoard.groups?.find((group) => group.title === groupName);
    if (!themeGroup) {
        throw new Error(`Group name ${groupName} is not found in Board:${themeBID}.`);
    }
    await themeGroup.update({
        queryLevel: QueryLevel.Cell,
        subitemLevel: "none",
    });
    return themeGroup;
}
async function getOfferGroup(offerBID, groupName) {
    if (groupName === "Choose Offer") {
        throw new Error(`Offer field is empty.`);
    }
    const offerBoard = await mondayClient.getBoard(offerBID, {
        queryLevel: QueryLevel.Group,
    });
    if (offerBoard === null) {
        throw new Error(`Theme board not found.`);
    }
    const offerGroup = offerBoard.groups?.find((group) => group.title === groupName);
    if (!offerGroup) {
        throw new Error(`Group name ${groupName} is not found in Board:${offerBID}.`);
    }
    await offerGroup.update({
        queryLevel: QueryLevel.Cell,
        subitemLevel: "none",
    });
    return offerGroup;
}
function validateRoundItem(roundFields, infraFFNtoCID) {
    try {
        const errors = [];
        if (!roundFields.roundType ||
            !Object.values(ROUND_TYPES).includes(roundFields.roundType)) {
            errors.push(`Round type is missing.`);
        }
        //TODO: Move to getRoundFields, all config error should be in get function
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
    }
    catch (err) {
        return {
            status: "fail",
            message: err.message,
        };
    }
}
function getRoundFields(roundItem, infraFFNtoCID) {
    const roundTypeCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Round_Type];
    const roundType = roundTypeCID
        ? roundItem.values[roundTypeCID]
        : undefined;
    const startDateCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Round_Start_Date];
    const startDate = startDateCID
        ? roundItem.values[startDateCID]
        : undefined;
    const endDateCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Round_End_Date];
    const endDate = endDateCID
        ? roundItem.values[endDateCID]
        : undefined;
    const emailScheduleHourCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Email_Hour];
    const emailScheduleHour = emailScheduleHourCID
        ? roundItem.values[emailScheduleHourCID]
        : undefined;
    const SMSScheduleHourCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.SMS_Hour];
    const SMSScheduleHour = SMSScheduleHourCID
        ? roundItem.values[SMSScheduleHourCID]
        : undefined;
    const OMGScheduleHourCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.OMG_Hour];
    const OMGScheduleHour = OMGScheduleHourCID
        ? roundItem.values[OMGScheduleHourCID]
        : undefined;
    const pushScheduleHourCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Push_Hour];
    const pushScheduleHour = pushScheduleHourCID
        ? roundItem.values[pushScheduleHourCID]
        : undefined;
    const isOneTimeCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Is_One_Time_Round];
    const isOneTime = isOneTimeCID
        ? roundItem.values[isOneTimeCID]
        : undefined;
    const tysonRoundCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Tyson_Round_ID];
    const tysonRound = tysonRoundCID
        ? roundItem.values[tysonRoundCID]
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
    //INTER: End round date can be null if is one time is checked, this will be in inter-validation
}
//NOTE: Here we retrieve values of the campaign itself and process it
function getCampaignFields(campaignItem, infraFFNtoCID, infraMapping) {
    if (!campaignItem.cells) {
        throw new Error(`Campaign item is not initialized.`);
    }
    const dateRangeCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Campaign_Date_Range];
    const [startDate, endDate] = dateRangeCID
        ? campaignItem.values[dateRangeCID]
        : [undefined, undefined];
    const abCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.AB];
    const ab = abCID ? campaignItem.values[abCID] : undefined;
    const tiersCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Tiers];
    const tiers = tiersCID
        ? campaignItem.values[tiersCID]
        : undefined;
    const controlGroupCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Control_Group];
    const controlGroup = controlGroupCID
        ? campaignItem.values[controlGroupCID]
        : undefined;
    //TODO: Verify if this exists in any board
    const isOneTimeCampaignCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Is_One_Time_Round];
    const isOneTime = isOneTimeCampaignCID
        ? campaignItem.values[isOneTimeCampaignCID]
        : undefined;
    const allRegulations = getItemsFromInfraMapping(infraMapping, (item) => {
        return item.values[ENV.INFRA.CIDS.COLUMN_GROUP] === COLUMN_GROUP.Market;
    });
    const allMarketsCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.All_Markets];
    const allMarketsChecked = campaignItem.values[allMarketsCID];
    const regulations = {};
    for (let i = 0; i < allRegulations.length; i++) {
        const regulation = allRegulations[i];
        const regulationName = regulation.values[ENV.INFRA.CIDS.FFN];
        const regulationCID = regulation.values[ENV.INFRA.CIDS.COLUMN_ID];
        const isRegulationChecked = Boolean(allMarketsChecked || campaignItem.values[regulationCID]);
        regulations[regulationName] = isRegulationChecked;
    }
    const statusCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Campaign_Status];
    //TODO: Validate if status is already created or etc
    const status = statusCID
        ? campaignItem.values[statusCID]
        : undefined;
    const personCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Person];
    const personId = personCID
        ? campaignItem.cells[personCID].rawValue
            .personsAndTeams[0].id
        : undefined;
    const themeCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Theme];
    const theme = themeCID
        ? campaignItem.values[themeCID]
        : undefined;
    const offerCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Offer];
    const offer = offerCID
        ? campaignItem.values[offerCID]
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
        isOneTime,
    };
}
function validateCampaignItem(campaignFields) {
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
        //TODO: FOR DESIGN ERROR HANDLING
        if (Object.keys(campaignFields.regulations).length === 0) {
            errors.push(`Campaign must have a regulation.`);
        }
        if (Object.values(campaignFields.regulations).filter((isChecked) => isChecked)
            .length === 0) {
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
            if (campaignFields.ab === null ||
                isNaN(campaignFields.ab) ||
                campaignFields.ab > 90 ||
                campaignFields.ab < 10) {
                errors.push(`Campaign's A/B value must be between 10-90 (inclusive).`);
            }
        }
        if (campaignFields.controlGroup !== undefined) {
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
function validateThemeItems(themeItems) {
    try {
        const themeErrors = {};
        return Object.keys(themeErrors).length
            ? {
                status: "error",
                errors: themeErrors,
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
function validateOfferItems(offerItems) {
    try {
        const offerErrors = {};
        return Object.keys(offerErrors).length
            ? {
                status: "error",
                errors: offerErrors,
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
async function getConfigGroup(configBID, groupName) {
    if (groupName === "Choose Offer") {
        throw new Error(`Offer field is empty.`);
    }
    const configBoard = await mondayClient.getBoard(configBID, {
        queryLevel: QueryLevel.Group,
    });
    if (configBoard === null) {
        throw new Error(`Config board not found.`);
    }
    const configGroup = configBoard.groups?.find((group) => group.title === groupName);
    if (!configGroup) {
        throw new Error(`Group name ${groupName} is not found in Board:${configBID}.`);
    }
    await configGroup.update({
        queryLevel: QueryLevel.Cell,
        subitemLevel: QueryLevel.Cell,
    });
    return configGroup;
}
function processRoundItems(roundItems, infraFFNtoCID) {
    try {
        const roundErrors = {};
        const roundFieldsObj = {};
        for (let i = 0; i < roundItems.length; i++) {
            const roundItem = roundItems[i];
            const roundFields = getRoundFields(roundItem, infraFFNtoCID);
            const result = validateRoundItem(roundFields, infraFFNtoCID);
            if (result.status === "fail") {
                return result;
            }
            else if (result.status === "error") {
                roundErrors[roundItem.name] = result.errors;
            }
            else {
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
    }
    catch (err) {
        return {
            status: "fail",
            message: err.message,
        };
    }
}
function processCampaignItem(campaignItem, infraFFNtoCID, infraMapping) {
    try {
        const campaignFields = getCampaignFields(campaignItem, infraFFNtoCID, infraMapping);
        const validationResult = validateCampaignItem(campaignFields);
        if (validationResult.status === "fail") {
            return validationResult;
        }
        else if (validationResult.status === "error") {
            return validationResult;
        }
        else {
            return {
                status: "success",
                result: campaignFields,
            };
        }
    }
    catch (err) {
        console.error(err.stack);
        return {
            status: "fail",
            message: err.message,
        };
    }
    //VALIDATION LAYER
}
//NOTE: Can throw error for not existing required config keys
function getThemeItems(themeGroup, infraFFNtoCID, allRegulations) {
    const themeItems = [];
    if (!themeGroup.items) {
        return [];
    }
    const parameterTypeCID = infraFFNtoCID[PARAMETER_LEVEL.Theme][FRIENDLY_FIELD_NAMES.Parameter_Type];
    const communicationTypeCID = infraFFNtoCID[PARAMETER_LEVEL.Theme][FRIENDLY_FIELD_NAMES.Parameter_Type];
    //we loop over regulations and get the value.
    //value is null if reg name is not found
    for (let i = 0; i < themeGroup.items.length; i++) {
        const themeItem = themeGroup.items[i];
        const valuesObj = {};
        for (let i = 0; i < allRegulations.length; i++) {
            const regulation = allRegulations[i];
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
            valuesObj[regulationName] = cell ? cell.value : null;
        }
        themeItems.push({
            parameterName: themeItem.name,
            parameterType: themeItem.values[parameterTypeCID],
            communicationType: themeItem.values[communicationTypeCID],
            values: valuesObj,
        });
    }
    return themeItems;
}
async function getConfigItems(configGroup, infraFFNtoCID, allRegulations) {
    const activeRegulations = allRegulations
        .filter((reg) => reg.isChecked)
        .map((reg) => reg.name);
    const commTypeCID = infraFFNtoCID[PARAMETER_LEVEL.Configuration][FRIENDLY_FIELD_NAMES.Configuration_Type];
    const commFieldCID = infraFFNtoCID[PARAMETER_LEVEL.Configuration][FRIENDLY_FIELD_NAMES.Configuration_Field];
    const commRoundCID = infraFFNtoCID[PARAMETER_LEVEL.Configuration][FRIENDLY_FIELD_NAMES.Configuration_Round];
    if (configGroup.items.length === 0) {
        //TODO: Handle no configuration here..
        return [];
    }
    let configItems = [];
    for (let i = 0; i < configGroup.items.length; i++) {
        const item = configGroup.items[i];
        const segments = {};
        const cells = Object.values(item.cells);
        if (cells.length === 0) {
            //TODO: No cells means board does not have columns
            return [];
        }
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (activeRegulations.includes(cell.title)) {
                segments[cell.title] = cell.value;
            }
        }
        const itemRound = item.values[commRoundCID];
        const itemType = item.values[commTypeCID];
        const itemField = item.values[commFieldCID];
        //If item has no subitems, we add a partial config item
        if (item.subitems.length === 0) {
            const configItem = {
                name: item.name,
                round: itemRound,
                type: itemType,
                fieldName: itemField,
                segments
            };
            configItems.push(configItem);
            continue;
        }
        //Otherwise we handle the subitem values by comparing column titles
        const sBoardId = item.subitems[0].boardId;
        const sBoard = await mondayClient.getBoard(sBoardId, {
            includeColumns: true,
            queryLevel: QueryLevel.Board
        });
        if (!sBoard) {
            throw new Error(`Subitem board is missing`);
        }
        const columns = sBoard.columns;
        const classification = columns.find((col) => col.title === CONFIGURATION_COLUMN_NAMES.Classification);
        const fieldId = columns.find((col) => col.title === CONFIGURATION_COLUMN_NAMES.Field_Id);
        const files = columns.find((col) => col.title === CONFIGURATION_COLUMN_NAMES.Files);
        const value = columns.find((col) => col.title === CONFIGURATION_COLUMN_NAMES.Value);
        if (!classification || !fieldId || !value) {
            throw new Error(`Missing required subitem columns`);
        }
        let fields = [];
        for (let j = 0; j < item.subitems.length; j++) {
            const subitem = item.subitems[j];
            if (!subitem.cells) {
                break;
            }
            const field = {
                name: subitem.name,
                classification: subitem.values[classification.columnId],
                fieldId: subitem.values[fieldId.columnId],
                value: subitem.values[value.columnId],
                files: files
                    ? subitem.values[files.columnId]
                    : undefined,
            };
            fields.push(field);
        }
        const configItem = {
            name: item.name,
            round: itemRound,
            type: itemType,
            fieldName: itemField,
            fields,
            segments
        };
        configItems.push(configItem);
    }
    return configItems;
}
function getOfferItems(offerGroup, infraFFNtoCID, allRegulations) {
    const offerItems = [];
    //TODO: VALIDATE EXISTENCE OF REQUIRED COLUMNS
    const parameterTypeCID = infraFFNtoCID[PARAMETER_LEVEL.Offer][FRIENDLY_FIELD_NAMES.Parameter_Type];
    const useAsComCID = infraFFNtoCID[PARAMETER_LEVEL.Offer][FRIENDLY_FIELD_NAMES.Use_as_Com];
    const bonusTypeCID = infraFFNtoCID[PARAMETER_LEVEL.Offer][FRIENDLY_FIELD_NAMES.Bonus_Type];
    const bonusFieldNameCID = infraFFNtoCID[PARAMETER_LEVEL.Offer][FRIENDLY_FIELD_NAMES.Bonus_Field_Name];
    //we loop over regulations and get the value.
    //value is null if reg name is not found
    for (let i = 0; i < offerGroup.items.length; i++) {
        const offerItem = offerGroup.items[i];
        const valuesObj = {};
        if (!offerItem.cells) {
            //TODO: Handle error
            return [];
        }
        for (let i = 0; i < allRegulations.length; i++) {
            const regulation = allRegulations[i];
            const regulationName = regulation.name;
            //We look for cell with the same title as regulation name,
            //If we cant find it, we set a default value of null,
            //if yes we populate valuesObj with the value
            const cell = Object.values(offerItem.cells).find((cell) => cell.title === regulationName);
            valuesObj[regulationName] = cell ? cell.value : null;
        }
        offerItems.push({
            name: offerItem.name,
            bonusFieldName: bonusFieldNameCID
                ? offerItem.values[bonusFieldNameCID]
                : undefined,
            bonusType: bonusTypeCID
                ? offerItem.values[bonusTypeCID]
                : undefined,
            useAsCom: useAsComCID
                ? offerItem.values[useAsComCID]
                : undefined,
            parameterType: offerItem.values[parameterTypeCID],
            values: valuesObj,
        });
    }
    ;
    return offerItems;
}
function processThemeGroup(themeGroup, infraFFNtoCID, allRegulations) {
    try {
        const themeItems = getThemeItems(themeGroup, infraFFNtoCID, allRegulations);
        const validationResult = validateThemeItems(themeItems);
        if (validationResult.status === "fail") {
            return validationResult;
        }
        else if (validationResult.status === "error") {
            return validationResult;
        }
        return {
            status: "success",
            result: themeItems,
        };
    }
    catch (err) {
        return {
            status: "fail",
            message: err.message,
        };
    }
}
function processOfferGroup(offerGroup, infraFFNtoCID, allRegulations) {
    try {
        const offerItems = getOfferItems(offerGroup, infraFFNtoCID, allRegulations);
        const validationResult = validateOfferItems(offerItems);
        if (validationResult.status === "fail") {
            return validationResult;
        }
        else if (validationResult.status === "error") {
            return validationResult;
        }
        return {
            status: "success",
            result: offerItems,
        };
    }
    catch (err) {
        return {
            status: "fail",
            message: err.message,
        };
    }
}
function validateConfigItems(configItems) {
    return {
        status: "success",
        data: null,
    };
}
async function processConfigGroup(configGroup, infraFFNtoCID, allRegulations) {
    try {
        const configItems = await getConfigItems(configGroup, infraFFNtoCID, allRegulations);
        // const validationResult = validateConfigItems(configItems);
        // if (validationResult.status === "fail") {
        //   return validationResult;
        // } else if (validationResult.status === "error") {
        //   return validationResult;
        // }
        return {
            status: "success",
            result: configItems,
        };
    }
    catch (err) {
        console.error(err.stack);
        return {
            status: "fail",
            message: err.message,
        };
    }
}
function generateRegulations(regulations, tiersList, ab) {
    //if tiers is undefined (not declared in infra boards)
    //we will just use the regulations as is.
    //if ab is empty (null) or not declared (undefined), 0 which is validation error, means we turn it off
    const allRegulations = [];
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
    }
    else {
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
    //Get cache record first if cache miss
    //Then use monstaa
    return mondayClient.getBoard(ENV.INFRA.BOARD_ID, {
        queryLevel: QueryLevel.Cell,
        subitemLevel: "none",
    });
}
async function importCampaign(webhook) {
    const campaignPID = Number(webhook.event.pulseId);
    const campaignBID = Number(webhook.event.boardId);
    const [infraBoard, campaignItem] = await Promise.all([
        getInfraBoard(),
        mondayClient.getItem({ itemId: campaignPID }, { queryLevel: QueryLevel.Cell, subitemLevel: QueryLevel.Cell }),
    ]);
    if (!infraBoard) {
        throw new Error(`Infra board not found.`);
    }
    if (!campaignItem) {
        throw new Error(`Campaign item not found.`);
    }
    const infraItem = infraBoard.items.find((item) => Number(item.values[ENV.INFRA.ROOT_CIDS.CAMPAIGN_BOARD_ID]) ===
        campaignBID);
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
    const infraFFNtoCID = {};
    const infraMapping = {};
    infraItem?.subitems?.forEach((subitem) => {
        const FFN = subitem.values[ENV.INFRA.CIDS.FFN];
        const columnGroup = subitem.values[ENV.INFRA.CIDS.PARAMETER_LEVEL];
        infraMapping[columnGroup] = infraMapping[columnGroup] || {};
        infraMapping[columnGroup][FFN] = subitem;
        infraFFNtoCID[columnGroup] = infraFFNtoCID[columnGroup] || {};
        infraFFNtoCID[columnGroup][FFN] = String(subitem.values[ENV.INFRA.CIDS.COLUMN_ID]);
    });
    const campaignDetails = processCampaignItem(campaignItem, infraFFNtoCID, infraMapping);
    if (campaignDetails.status === "error") {
        //TODO: generate report
        return;
    }
    else if (campaignDetails.status === "fail") {
        //TODO: error handling here
        return;
    }
    const roundDetails = processRoundItems(campaignItem.subitems, infraFFNtoCID);
    const themeBID = infraItem.values[ENV.INFRA.ROOT_CIDS.THEME_BOARD_ID];
    const offerBID = infraItem.values[ENV.INFRA.ROOT_CIDS.OFFER_BOARD_ID];
    const configBID = infraItem.values[ENV.INFRA.ROOT_CIDS.CONFIG_BOARD_ID];
    const themeName = campaignDetails.result.theme;
    const offerName = campaignDetails.result.offer;
    const regulations = campaignDetails.result.regulations;
    const tiers = campaignDetails.result.tiers; //Comma-separated
    const ab = campaignDetails.result.ab;
    const allRegulations = generateRegulations(regulations, tiers, ab);
    const [themeGroup, offerGroup, configGroup] = await Promise.all([
        getThemeGroup(themeBID, themeName),
        getOfferGroup(offerBID, offerName),
        getConfigGroup(configBID, offerName),
    ]);
    const themeDetails = processThemeGroup(themeGroup, infraFFNtoCID, allRegulations);
    const offerDetails = processOfferGroup(offerGroup, infraFFNtoCID, allRegulations);
    const configDetails = await processConfigGroup(configGroup, infraFFNtoCID, allRegulations);
    if (themeDetails.status === "fail" ||
        offerDetails.status === "fail" ||
        roundDetails.status === "fail") {
        //generate report
        return;
    }
    else if (themeDetails.status === "error" ||
        offerDetails.status === "error" ||
        roundDetails.status === "error") {
        //error handling here
        return;
    }
    console.log(JSON.stringify(campaignDetails.result, null, 2));
    console.log(JSON.stringify(roundDetails.result, null, 2));
    console.log(JSON.stringify(themeDetails.result, null, 2));
    console.log(JSON.stringify(offerDetails.result, null, 2));
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