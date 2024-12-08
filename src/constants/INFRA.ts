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
  Round_End_Date: "Round End Date",
  Email_Hour: "Email Schedule Hour",
  OMG_Hour: "OMG Schedule Hour",
  Push_Hour: "Push Schedule Hour",
  SMS_Hour: "SMS Schedule Hour",
  Person: "Person",
  Distribute_Now: "Distribute Now",
  Is_One_Time_Round: "Is One Time",
  Tyson_Round_ID: "Tyson Round ID",
  Campaign_Status: "Campaign Status",
  Parameter_Type: "Parameter Type",
  Bonus_Type: "Bonus Type",
  Bonus_Field_Name: "Bonus Field Name",
  Use_as_Com: "Use as Com",
  Configuration_Type: "Configuration Type",
  Configuration_Field: "Configuration Field",
  Configuration_Round: "Configuration Round",
};

export const ROUND_TYPES = {
  Intro: "Intro",
  Reminder_1: "Reminder 1",
  Reminder_2: "Reminder 2",
};

export const CAMPAIGN_STATUSES = {
  Draft: { Id: 1, Name: "Draft" },
  In_Progress: { Id: 2 },
  Ready_For_Tyson: { Id: 3, Name: "Ready For Tyson" },
  In_Queue: { Id: 4 },
  Campaign_Created: { Id: 5, Name: "Campaign Created" },
  Test_Pending_Approval: { Id: 6, Name: "Test Pending Approval" },
  Approved_For_Production: { Id: 7, Name: "Approved For Prod" },
  Error: { Id: 8, Name: "Error" },
  In_Prod: { Id: 9, Name: "In Prod" },
  Completed: { Id: 10, Name: "Completed" },
  Launched: { Id: 11, Name: "Launched" },
  For_Cancellation: { Id: 12, Name: "For Cancellation" },
  Canceled: { Id: 13, Name: "Canceled" },
};

export const PARAMETER_LEVEL = {
  Campaign: "Campaign",
  Round: "Round",
  Theme: "Theme",
  Offer: "Offer",
  Configuration: "Configuration",
  None: "",
};

export const CONFIGURATION_TYPES = {
    Promocode_Config: "Promocode Config",
    Neptune_Config: "Neptune Config",
    Pacman_Config: "Pacman Config",
    Neptune_Bind: "Neptune Bind",
    Banner: "Banner",
    Promotion_Image: "Promotion Image",
    Promotion_CTA: "Promotion CTA",
    Promotion_Text: "Promotion Text"
}

export const COLUMN_GROUP = {
    Market: "Market",
    Additional_Data: "Additional Data",
    Population_Filter: "Population Filter",
    None: "",
}
export const CONFIGURATION_COLUMN_NAMES = {
    Classification: "Classification",
    Field_Id: "Field Id",
    Value: "Value",
    Files: "Files",
}