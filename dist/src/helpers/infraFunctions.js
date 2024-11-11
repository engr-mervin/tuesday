export function getItemsFromInfraMapping(infraItemMapping, predicate) {
    const items = [];
    Object.keys(infraItemMapping).forEach((key) => {
        const item = infraItemMapping[key];
        if (predicate(item)) {
            items.push(item);
        }
    });
    return items;
}
export function getItemFromInfraMapping(infraItemMapping, predicate) {
    const keys = Object.keys(infraItemMapping);
    for (let i = 0; i < keys.length; i++) {
        const item = infraItemMapping[keys[i]];
        if (predicate(item)) {
            return item;
        }
    }
}
export function getCIDFromInfraMapping(infraItemMapping, predicate) {
    const keys = Object.keys(infraItemMapping);
    for (let i = 0; i < keys.length; i++) {
        const item = infraItemMapping[keys[i]];
        if (predicate(item)) {
            if (item.cells) {
                return item.cells[process.env.INFRA_CONFIG_COLUMN_ID_CID].value;
            }
        }
    }
}
//# sourceMappingURL=infraFunctions.js.map