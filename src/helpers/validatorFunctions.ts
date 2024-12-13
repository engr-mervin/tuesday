//Will return true for empty strings
export function isInteger(number: string | number | null): number is number {
  return Number.isInteger(Number(number));
}

//Will return false for empty strings
export function isIntegerNonEmpty (str: string): boolean {
  return Number.isInteger(Number.parseInt(str, 10));
};


export function isValidNumber(
  number: any,
  minDigits: number,
  maxDigits: number,
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
  if (numberCast >= 10 ** maxDigits) {
    return false;
  }
  if (numberCast < 10 ** (minDigits - 1)) {
    return false;
  }

  return true;
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

