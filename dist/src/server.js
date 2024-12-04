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
async function getOfferGroup(offerBID, groupName) {
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
    if (!roundItem.cells) {
        throw new Error(`Round item is not initialized.`);
    }
    const roundTypeCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Round_Type];
    const roundType = roundTypeCID
        ? roundItem.cells[roundTypeCID].value
        : undefined;
    const startDateCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Round_Start_Date];
    const startDate = startDateCID
        ? roundItem.cells[startDateCID].value
        : undefined;
    const endDateCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Round_Start_Date];
    const endDate = endDateCID
        ? roundItem.cells[endDateCID].value
        : undefined;
    const emailScheduleHourCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Round_Start_Date];
    const emailScheduleHour = emailScheduleHourCID
        ? roundItem.cells[emailScheduleHourCID].value
        : undefined;
    const SMSScheduleHourCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Round_Start_Date];
    const SMSScheduleHour = SMSScheduleHourCID
        ? roundItem.cells[SMSScheduleHourCID].value
        : undefined;
    const OMGScheduleHourCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Round_Start_Date];
    const OMGScheduleHour = OMGScheduleHourCID
        ? roundItem.cells[OMGScheduleHourCID].value
        : undefined;
    const pushScheduleHourCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Round_Start_Date];
    const pushScheduleHour = pushScheduleHourCID
        ? roundItem.cells[pushScheduleHourCID].value
        : undefined;
    const isOneTimeCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Is_One_Time_Round];
    const isOneTime = isOneTimeCID
        ? roundItem.cells[isOneTimeCID].value
        : undefined;
    const tysonRoundCID = infraFFNtoCID[PARAMETER_LEVEL.Round][FRIENDLY_FIELD_NAMES.Is_One_Time_Round];
    const tysonRound = tysonRoundCID
        ? roundItem.cells[tysonRoundCID].value
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
function getCampaignFields(campaignItem, infraFFNtoCID, infraMapping) {
    if (!campaignItem.cells) {
        throw new Error(`Campaign item is not initialized.`);
    }
    const dateRangeCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Campaign_Date_Range];
    const [startDate, endDate] = dateRangeCID
        ? campaignItem.cells[dateRangeCID].value
        : [undefined, undefined];
    const abCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.AB];
    const ab = abCID ? campaignItem.cells[abCID].value : undefined;
    const tiersCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Tiers];
    const tiers = tiersCID
        ? campaignItem.cells[tiersCID].value
        : undefined;
    const controlGroupCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Control_Group];
    const controlGroup = controlGroupCID
        ? campaignItem.cells[controlGroupCID].value
        : undefined;
    const allRegulations = getItemsFromInfraMapping(infraMapping, (item) => {
        return (item.cells[process.env.INFRA_CONFIG_COLUMN_GROUP_CID].value ===
            COLUMN_GROUP.Market);
    });
    const allMarketsCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.All_Markets];
    const regulations = {};
    for (let i = 0; i < allRegulations.length; i++) {
        const regulation = allRegulations[i];
        const regulationName = regulation.cells[process.env.INFRA_CONFIG_FFN_CID]
            .value;
        const regulationCID = regulation.cells[process.env.INFRA_CONFIG_COLUMN_ID_CID].value;
        const isRegulationChecked = Boolean(campaignItem.cells[allMarketsCID].value ||
            campaignItem.cells[regulationCID].value);
        regulations[regulationName] = isRegulationChecked;
    }
    const statusCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Campaign_Status];
    const status = statusCID
        ? campaignItem.cells[statusCID].value
        : undefined;
    const personCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Person];
    const personId = personCID
        ? campaignItem.cells[personCID].rawValue
            .personsAndTeams[0].id
        : undefined;
    const themeCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Theme];
    const theme = themeCID
        ? campaignItem.cells[themeCID].value
        : undefined;
    const offerCID = infraFFNtoCID[PARAMETER_LEVEL.Campaign][FRIENDLY_FIELD_NAMES.Offer];
    const offer = offerCID
        ? campaignItem.cells[offerCID].value
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
        //VALIDATE REGULATIONS AND TIERS
        //TODO: FOR DESIGN ERROR HANDLING
        if (Object.keys(campaignFields.regulations).length === 0) {
            errors.push(`Campaign must have a regulation.`);
        }
        if (Object.values(campaignFields.regulations).filter((isChecked) => isChecked)
            .length === 0) {
            errors.push(`Campaign has no chosen regulation.`);
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
function validateOfferItems(themeItems) {
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
    const configGroups = await mondayClient.getBoard(configBID, {
        queryLevel: QueryLevel.Group,
    });
    if (groupName === "Choose Offer") {
        throw new Error(`Offer field is empty.`);
    }
    const configGroup = configGroups.groups?.find((group) => group.title === groupName);
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
        if (roundItems === undefined) {
            throw new Error(`Round items missing.`);
        }
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
    const themeItems = {};
    if (!themeGroup.items) {
        return {};
    }
    const parameterTypeCID = infraFFNtoCID[PARAMETER_LEVEL.Theme][FRIENDLY_FIELD_NAMES.Parameter_Type];
    const communicationTypeCID = infraFFNtoCID[PARAMETER_LEVEL.Theme][FRIENDLY_FIELD_NAMES.Parameter_Type];
    //we loop over regulations and get the value.
    //value is null if reg name is not found
    for (let i = 0; i < themeGroup.items.length; i++) {
        const themeItem = themeGroup.items[i];
        const valuesObj = {};
        if (!themeItem.cells) {
            //handle error
            return {};
        }
        for (let i = 0; i < allRegulations.length; i++) {
            const regulation = allRegulations[i];
            const regulationName = regulation.name;
            //We look for cell with the same title as regulation name,
            //If we cant find it, we set a default value of null,
            //if yes we populate valuesObj with the value
            const cell = themeItem.rawCells.find((cell) => cell.title === regulationName);
            //We're treting columns that does not exist to be null
            //This is against our convention to set undefined to mean does not exist
            //and null for existing but empty value
            //The only reason is for legacy
            valuesObj[regulationName] = cell ? cell.value : null;
        }
        themeItems[themeItem.name] = {
            parameterName: themeItem.name,
            parameterType: themeItem.cells[parameterTypeCID].value,
            communicationType: themeItem.cells[communicationTypeCID].value,
            values: valuesObj,
        };
    }
    return themeItems;
}
function getConfigItems(configGroup, infraFFNtoCID, allRegulations) {
    const activeRegulations = allRegulations
        .filter((reg) => reg.isChecked)
        .map((reg) => reg.name);
    const commTypeCID = infraFFNtoCID[PARAMETER_LEVEL.Configuration][FRIENDLY_FIELD_NAMES.Configuration_Type];
    const commFieldCID = infraFFNtoCID[PARAMETER_LEVEL.Configuration][FRIENDLY_FIELD_NAMES.Configuration_Field];
    const commRoundCID = infraFFNtoCID[PARAMETER_LEVEL.Configuration][FRIENDLY_FIELD_NAMES.Configuration_Round];
    if (!configGroup.items) {
        //TODO: Handle no configuration here..
        return [];
    }
    let configItems = [];
    //Loop over items of group and do an if else to handle
    for (let i = 0; i < configGroup.items.length; i++) {
        const item = configGroup.items[i];
        if (!item.cells || !item.rawCells) {
            //TODO: No cells mean all items have no cells, handle error
            return [];
        }
        const segments = [];
        for (let i = 0; i < item.rawCells.length; i++) {
            const cell = item.rawCells[i];
            if ([commTypeCID, commFieldCID, commRoundCID].includes(cell.columnId)) {
                continue;
            }
            //TODO: Monsta, add types in cell
            if (cell.text === "checkbox") {
                segments.push({ name: cell.title, isChecked: Boolean(cell.value) });
            }
        }
        //TODO: Monsta Make another field: 'values', which outputs the string value.
        const itemRound = item.cells[commRoundCID].value;
        const itemType = item.cells[commTypeCID].value;
        const itemField = item.cells[commFieldCID].value;
        if (!item.subitems) {
            //subitems should not be undefined, can be empty, but not undefined.
            return [];
        }
        //TODO: REGION: Refactor this region
        //TODO: Monsta get columns of a board/subitem board
        let foundClassificationCID;
        let foundFieldIdCID;
        let foundValueCID;
        let foundFilesCID;
        //Workaround to get CIDs
        for (let j = 0; j < item.subitems.length; j++) {
            const subitem = item.subitems[j];
            if (!subitem.rawCells || subitem.rawCells.length === 0) {
                break;
            }
            //Iterate and take the CIDs
            for (let k = 0; k < subitem.rawCells.length; k++) {
                const cell = subitem.rawCells[k];
                if (cell.title === CONFIGURATION_COLUMN_NAMES.Classification) {
                    foundClassificationCID = cell.columnId;
                }
                else if (cell.title === CONFIGURATION_COLUMN_NAMES.Field_Id) {
                    foundFieldIdCID = cell.columnId;
                }
                else if (cell.title === CONFIGURATION_COLUMN_NAMES.Files) {
                    foundFilesCID = cell.columnId;
                }
                else if (cell.title === CONFIGURATION_COLUMN_NAMES.Value) {
                    foundValueCID = cell.columnId;
                }
            }
        }
        //
        if (!foundClassificationCID || !foundFieldIdCID || !foundValueCID) {
            //TODO: Fix appropriately
            throw new Error();
        }
        //Get subitems
        let fields = [];
        for (let j = 0; j < item.subitems.length; j++) {
            const subitem = item.subitems[j];
            if (!subitem.rawCells || !subitem.cells) {
                break;
            }
            const field = {
                name: subitem.name,
                classification: subitem.cells[foundClassificationCID].value,
                fieldId: subitem.cells[foundFieldIdCID].value,
                value: subitem.cells[foundValueCID].value,
                files: foundFilesCID
                    ? subitem.cells[foundFilesCID].value
                    : undefined,
            };
            fields.push(field);
        }
        //END REGION
        const configItem = {
            name: item.name,
            round: itemRound,
            type: itemType,
            fieldName: itemField,
            fields,
        };
    }
}
function getOfferItems(offerGroup, infraFFNtoCID, allRegulations) {
    const offerItems = {};
    if (!offerGroup.items) {
        //TODO: items can be empty but not undefined
        //handle error here
        return {};
    }
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
            //handle error
            return {};
        }
        for (let i = 0; i < allRegulations.length; i++) {
            const regulation = allRegulations[i];
            const regulationName = regulation.name;
            //We look for cell with the same title as regulation name,
            //If we cant find it, we set a default value of null,
            //if yes we populate valuesObj with the value
            const cell = offerItem.rawCells.find((cell) => cell.title === regulationName);
            valuesObj[regulationName] = cell ? cell.value : null;
        }
        //TODO: Fix typing of cell value
        offerItems[offerItem.name] = {
            parameterName: offerItem.name,
            bonusFieldName: bonusFieldNameCID
                ? offerItem.cells[bonusFieldNameCID].value
                : undefined,
            bonusType: bonusTypeCID
                ? offerItem.cells[bonusTypeCID].value
                : undefined,
            useAsCom: useAsComCID
                ? offerItem.cells[useAsComCID].value
                : undefined,
            parameterType: offerItem.cells[parameterTypeCID].value,
            values: valuesObj,
        };
    }
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
function processConfigGroup(configGroup, infraFFNtoCID, allRegulations) {
    try {
        const configItems = getConfigItems(configGroup, infraFFNtoCID, allRegulations);
        const validationResult = validateConfigItems(configItems);
        if (validationResult.status === "fail") {
            return validationResult;
        }
        else if (validationResult.status === "error") {
            return validationResult;
        }
        return {
            status: "success",
            result: configItems,
        };
    }
    catch (err) {
        return {
            status: "fail",
            message: err.message,
        };
    }
}
function generateRegulations(regulations, tiers, ab) {
    //if tiers is undefined (not declared in infra boards)
    //we will just use the regulations as is.
    //if ab is empty (null) or not declared (undefined), 0 which is validation error, means we turn it off
    const allRegulations = [];
    if (tiers) {
        const tiersList = tiers.split(",").map((tier) => tier.trim());
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
async function importCampaign(webhook) {
    const campaignPID = Number(webhook.event.pulseId);
    const campaignBID = Number(webhook.event.boardId);
    const friendlyFieldNameCID = process.env.INFRA_CONFIG_FFN_CID;
    const columnIDCID = process.env.INFRA_CONFIG_COLUMN_ID_CID;
    const columnGroupCID = process.env.INFRA_CONFIG_PARAMETER_LEVEL_CID;
    const x = mondayClient.operations.getBoardItemsOp({ ids: String(process.env.INFRA_BOARD) });
    console.log(x);
    return;
    const [infraBoard, campaignItem] = await Promise.all([
        mondayClient.operations.getBoardItemsOp({ ids: String(process.env.INFRA_BOARD) }),
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
        const FFN = subitem.cells[friendlyFieldNameCID].value;
        const columnGroup = String(subitem.cells[columnGroupCID].value);
        infraMapping[columnGroup] = infraMapping[columnGroup] || {};
        infraMapping[columnGroup][FFN] = subitem;
        infraFFNtoCID[columnGroup] = infraFFNtoCID[columnGroup] || {};
        infraFFNtoCID[columnGroup][FFN] = String(subitem.cells[String(columnIDCID)].value);
    });
    const campaignDetails = processCampaignItem(campaignItem, infraFFNtoCID, infraMapping);
    if (campaignDetails.status === "error") {
        //generate report
        return;
    }
    else if (campaignDetails.status === "fail") {
        //error handling here
        return;
    }
    const roundDetails = processRoundItems(campaignItem.subitems, infraFFNtoCID);
    //GET theme board id, offer board id, etc...
    const themeBID = infraItem.cells[process.env.INFRA_THEME_BOARD_ID_CID].value;
    const offerBID = infraItem.cells[process.env.INFRA_OFFER_BOARD_ID_CID].value;
    const configBID = infraItem.cells[process.env.INFRA_CONFIG_BOARD_ID_CID].value;
    const themeName = campaignDetails.result.theme;
    const offerName = campaignDetails.result.offer;
    const regulations = campaignDetails.result.regulations;
    const tiers = campaignDetails.result.tiers; //Comma-separated
    const ab = campaignDetails.result.ab;
    const allRegulations = generateRegulations(regulations, tiers, ab);
    //TODO: Add getuser in monsta
    //TODO: Query injection instead of multiple cases
    //TODO: Maybe offer batching capabilities to Monsta
    const [themeGroup, offerGroup, configGroup] = await Promise.all([
        getThemeGroup(themeBID, themeName),
        getOfferGroup(offerBID, offerName),
        getConfigGroup(configBID, offerName),
    ]);
    const themeDetails = processThemeGroup(themeGroup, infraFFNtoCID, allRegulations);
    const offerDetails = processOfferGroup(offerGroup, infraFFNtoCID, allRegulations);
    const configDetails = processConfigGroup(configGroup, infraFFNtoCID);
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