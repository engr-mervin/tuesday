export function addDays(date, increment) {
    let inputDate = date instanceof Date ? date : new Date(date);
    if (isNaN(inputDate.getTime())) {
        return inputDate;
    }
    inputDate.setDate(inputDate.getDate() + increment);
    return inputDate;
}
export function getToday() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
//# sourceMappingURL=dateFunctions.js.map