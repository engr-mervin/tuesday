import { Time } from "../types/generalTypes";

export function addDays(date: string | Date, increment: number): Date {
  let inputDate =
    date instanceof Date ? new Date(date.getTime()) : new Date(date);
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


//YYYY-MM-DD
export function stringToDate(inp: string, sep: string = "-"): Date | null {
  const dateArray = inp.split(sep);
  if (dateArray.length !== 3) {
    return null;
  }

  const year = Number(dateArray[0]);
  const month = Number(dateArray[1]);
  const day = Number(dateArray[2]);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null; // Invalid date (e.g., February 30)
  }

  return date;
}

export function timeStringToMinutes(inp: Time){
  const [hours, minutes] = inp.split(":").map(Number);
  return hours * 60 + minutes;
}

export function stringToDateDDMMYYYY(inp: string, sep: string = "-"): Date | null {
  const dateArray = inp.split(sep);
  if (dateArray.length !== 3) {
    return null;
  }

  const year = Number(dateArray[2]);
  const month = Number(dateArray[1]);
  const day = Number(dateArray[0]);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null; // Invalid date (e.g., February 30)
  }

  return date;
}
