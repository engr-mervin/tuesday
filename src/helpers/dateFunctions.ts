export function addDays(date: string | Date, increment: number): Date {
  let inputDate = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  if (isNaN(inputDate.getTime())) {
    return inputDate;
  }
  inputDate.setDate(inputDate.getDate() + increment);
  return inputDate;
}

export function getToday() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}
