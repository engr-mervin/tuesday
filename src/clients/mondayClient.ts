import { createMondayClient } from "monstaa";

export const mondayClient = createMondayClient({
  name: "tuesday",
  version: '23-10',
  apiToken: process.env.MONDAY_API_TOKEN as string});