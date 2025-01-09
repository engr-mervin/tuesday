import { BANNER_REGEX } from "../constants/regexConstants.js";

//Will return true for empty strings
export function isInteger(number: string | number | null): number is number {
  return Number.isInteger(Number(number));
}

//Will return false for empty strings
export function isIntegerNonEmpty(str: string): boolean {
  return Number.isInteger(Number.parseInt(str, 10));
}

export function isCommaSeparatedListOfIntegers(input: string) {
  const nums = input.split(",");

  return nums.every((num) => isIntegerNonEmpty(num));
}

export function isCommaSeparatedList(input: string, predicate: (v: string) => boolean) {
  const values = input.split(",");
  return values.every((value) => predicate(value));
}

export function isValidStringRange(str: string) {
  const strs = str.split("-");

  if (strs.length !== 2) {
    return false;
  }
  const [min, max] = strs.map(Number);

  if (!isInteger(min) || !isInteger(max)) {
    return false;
  }

  return min < max;
}

export function isNumberInRange(
  number: any,
  minInclusive: number = -Infinity,
  maxInclusive: number = +Infinity,
  allowNegativeOne: boolean = false,
  allowZero: boolean = false
): boolean {
  const numberCast = Number(number);
  if (isNaN(numberCast)) {
    return false;
  }

  if (
    (allowNegativeOne && numberCast === -1) ||
    (allowZero && numberCast === 0)
  ) {
    return true;
  }

  if (
    (!allowNegativeOne && numberCast === -1) ||
    (!allowZero && numberCast === 0)
  ) {
    return false;
  }
  if (numberCast > maxInclusive) {
    return false;
  }
  if (numberCast < minInclusive) {
    return false;
  }

  return true;
}

export function isStringOfLength(
  str: any,
  minInclusive: number = 0,
  maxInclusive: number = +Infinity,
  regex: RegExp | null = null
) {
  if (typeof str !== "string") {
    return false;
  }
  if (str.length > maxInclusive || str.length < minInclusive) {
    return false;
  }
  if (regex && !regex.test(str)) {
    return false;
  }
  return true;
}

export function isInsideClosedListLax(...args: string[]) {
  return isInsideClosedListStrict(
    args[0],
    ...args.slice(1).map((arg) => arg.toLowerCase())
  );
}

export function isInsideClosedListStrict(value: string, ...list: string[]) {
  return list.includes(value);
}

export function isValidTime(value: string, is24hour: boolean = true) {
  if (!value) {
    return false;
  }
  const trimmed = value.toString().trim();

  const split = trimmed.split(":");

  if (split.length !== 2) {
    return false;
  }

  const [hour, minute] = split;

  //validate hour
  const hourCast = Number(hour);
  const trimmedHour = hour.toString().trim();
  if (isNaN(hourCast)) {
    return false;
  }
  if (is24hour && (hourCast > 23 || hourCast < 0)) {
    return false;
  }
  if (!is24hour && (hourCast > 12 || hourCast < 0)) {
    return false;
  }
  if (trimmedHour.length > 2 || trimmedHour.length < 1) {
    return false;
  }

  //validate minute
  const minuteCast = Number(minute);
  const trimmedMinute = minute.toString().trim();
  if (isNaN(minuteCast)) {
    return false;
  }
  if (minuteCast > 59 || minuteCast < 0) {
    return false;
  }
  if (trimmedMinute.length !== 2) {
    return false;
  }

  return true;
}

export function isIntegerInRange(
  number: any,
  minInclusive: number = -Infinity,
  maxInclusive: number = +Infinity,
  allowList: number[] = []
): boolean {
  const numberCast = Number(number);

  if (!Number.isInteger(numberCast)) {
    return false;
  }

  if (allowList.includes(numberCast)) {
    return true;
  }

  if (numberCast > maxInclusive) {
    return false;
  }
  if (numberCast < minInclusive) {
    return false;
  }

  return true;
}

export function isValidBannerId(value: string) {
  return BANNER_REGEX.test(value);
}

export function isFloatInRange(
  number: any,
  minInclusive: number = -Infinity,
  maxInclusive: number = +Infinity,
  allowList: number[] = []
): boolean {
  const numberCast = Number(number);

  if (allowList.includes(numberCast)) {
    return true;
  }

  if (numberCast > maxInclusive) {
    return false;
  }
  if (numberCast < minInclusive) {
    return false;
  }

  return true;
}
