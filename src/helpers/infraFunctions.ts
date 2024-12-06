// import { Item } from "monstaa/dist/classes/Item";

// export function getItemsFromInfraMapping(
//   infraItemMapping: Record<string, Record<string, Item>>,
//   predicate: (item: Item) => boolean
// ): Item[] {
//   const items: Item[] = [];

//   Object.keys(infraItemMapping).forEach((columnGroup) => {
//     const group = infraItemMapping[columnGroup];

//     if (typeof group === "object") {
//       Object.keys(group).forEach((ffn) => {
//         const item = group[ffn];
//         if (predicate(item)) {
//           items.push(item);
//         }
//       });
//     }
//   });

//   return items;
// }

// export function getItemFromInfraMapping(
//   infraItemMapping: Record<string, Record<string, Item>>,
//   predicate: (item: Item) => boolean
// ): Item | undefined {
//   const keys = Object.keys(infraItemMapping);
//   for (let i = 0; i < keys.length; i++) {
//     const group = infraItemMapping[keys[i]];
//     if (typeof group === "object") {
//       const ffns = Object.keys(group);
//       for (let j = 0; j < ffns.length; j++) {
//         const item = group[ffns[j]];
//         if (predicate(item)) {
//           return item;
//         }
//       }
//     }
//   }
// }

// export const transformCommunicationName = (inputStr: string) => {
//   const str = inputStr.toLowerCase();
//   const arr = str.split(/,| |-/);
//   for (let i = 0; i < arr.length; i++) {
//     if (i === 0) {
//       arr[i] = arr[i].charAt(0).toLowerCase() + arr[i].slice(1);
//     } else {
//       arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
//     }
//   }
//   return arr.join("");
// };

// export function getCIDFromInfraMapping(
//   infraItemMapping: Record<string, Item>,
//   predicate: (item: Item) => boolean
// ): string | undefined {
//   const keys = Object.keys(infraItemMapping);
//   for (let i = 0; i < keys.length; i++) {
//     const item = infraItemMapping[keys[i]];
//     if (predicate(item)) {
//       if (item.cells) {
//         return item.cells[process.env.INFRA_CONFIG_COLUMN_ID_CID!]
//           .value as string;
//       }
//     }
//   }
// }
