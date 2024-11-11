export function isInteger(number: string | number | null): number is number {
  return Number.isInteger(Number(number));
}
