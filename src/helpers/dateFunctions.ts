import { Time, YYYYMMDDString } from "../types/generalTypes";

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

export function dateToYYYYMMDDString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

//YYYY-MM-DD
export function stringYYYYMMDDToDate(
  inp: string,
  sep: string = "-"
): Date | null {
  const dateArray = inp.split(sep);
  if (dateArray.length !== 3) {
    return null as any;
  }

  const year = Number(dateArray[0]);
  const month = Number(dateArray[1]);
  const day = Number(dateArray[2]);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null as any;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null as any; // Invalid date (e.g., February 30)
  }

  return date;
}

export function timeObjectToString(time: { hour: string; minute: string }) {
  return `${time.hour.padStart(2, "0")}:${time.minute.padStart(
    2,
    "0"
  )}`;
}

export function timeStringToMinutes(inp: Time) {
  const [hours, minutes] = inp.split(":").map(Number);
  return hours * 60 + minutes;
}

export function stringDDMMYYYYToDate(
  inp: string,
  sep: string = "-"
): Date | null {
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
