export const CAMPAIGN_COLUMNS = {
  ReadyForTyson: {
    ID: 3,
    Name: "Ready For Tyson",
  },
};

export const FRIENDLY_FIELD_NAMES = {
  Offer: "Offer",
  Theme: "Theme",
  Campaign_Date_Range: "Campaign Dates Range",
  Didnt_Deposit_with_Promocode: "Didnt Deposit with Promocode",
  All_Markets: "ALL Markets",
  Tiers: "Tiers",
  AB: "A/B",
  Control_Group: "Control Group",
  Round_Type: "Round Type",
  Round_Start_Date: "Round Start Date",
  Round_End_Date: "Round Start Date",
  Email_Hour: "Email Schedule Hour",
  OMG_Hour: "OMG Schedule Hour",
  Person: "Person",
  Distribute_Now: "Distribute Now",
  Is_One_Time_Round: "Is One Time",
  Campaign_Status: "Campaign Status",
  Person: "Person",
};

export const ROUND_TYPES = {
  Intro: "Intro",
  Reminder_1: "Reminder 1",
  Reminder_2: "Reminder 2",
};

export const CAMPAIGN_STATUSES = {
  Draft: { Id: 1, Name: "Draft" },
  InProgress: { Id: 2 },
  ReadyForTyson: { Id: 3, Name: "Ready For Tyson" },
  InQueue: { Id: 4 },
  CampaignCreated: { Id: 5, Name: "Campaign Created" },
  TestPendingApproval: { Id: 6, Name: "Test Pending Approval" },
  ApprovedForProduction: { Id: 7, Name: "Approved For Prod" },
  Error: { Id: 8, Name: "Error" },
  InProd: { Id: 9, Name: "In Prod" },
  Completed: { Id: 10, Name: "Completed" },
  Launched: { Id: 11, Name: "Launched" },
  ForCancellation: { Id: 12, Name: "For Cancellation" },
  Canceled: { Id: 13, Name: "Canceled" },
};

export const COLUMN_GROUP = {
  Campaign: "Campaign",
  Market: "Market",
  Round: "Round",
  None: "",
};
