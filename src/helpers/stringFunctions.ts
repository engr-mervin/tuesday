export function arrayToCommaSeparatedList(arr: string[]) {
  const trimmed = arr.map((str) => str.trim());
  const joined = trimmed.join(", ");

  return joined;
}
 