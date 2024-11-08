import { Item } from "monstaa/dist/classes/Item";

export function getItemsFromInfraMapping(
  infraItemMapping: Record<string, Item>,
  predicate: (item: Item) => boolean
): Item[] {
  const items: Item[] = [];

  Object.keys(infraItemMapping).forEach((key) => {
    const item = infraItemMapping[key];
    if (predicate(item)) {
      items.push(item);
    }
  });

  return items;
}

export function getItemFromInfraMapping(
  infraItemMapping: Record<string, Item>,
  predicate: (item: Item) => boolean
): Item | undefined {
  const keys = Object.keys(infraItemMapping);
  for (let i = 0; i < keys.length; i++) {
    const item = infraItemMapping[keys[i]];
    if (predicate(item)) {
      return item;
    }
  }
}
