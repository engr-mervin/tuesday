export const CAMPAIGN_COLUMNS = {
  ReadyForTyson: {
    ID: 3,
    Name: "Ready For Tyson",
  },
};

export const CLOSED_POPULATION_OPTIONS = {
  Pragmatic: "Pragmatic",
  CSV: "Load from CSV",
};

export const CLOSED_POPULATION_EXTENSIONS = {
  CSV: "csv",
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
  //TODO: Fix small p in board infra
  Closed_Population: "Closed population",
  Files: "Files",
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
  Offer_Parameter_Type: "Parameter Type",
  Theme_Parameter_Type: "Parameter Type",
  Theme_Communication_Type: "Communication Type",
  Bonus_Type: "Bonus Type",
  Bonus_Field_Name: "Bonus Field Name",
  Use_as_Com: "Use as Com",

  //TODO: Align these
  Configuration_Type: "Communication Type",
  Configuration_Field: "Communication Field",
  Configuration_Round: "Communication Round",

  //Action Flags
  Import_Parameters: "Import Parameters",
  Exclude_Default_Parameters: "Exclude Default Parameters",
  Connect_Reminders: "Connect Reminders",
  Delete_Segments: "Delete Segments",
  Is_One_Time: "Is One Time",
  Cancel_Rounds: "Cancel Rounds",
};

export const ROUND_TYPES = {
  Intro: "Intro",
  Reminder_1: "Reminder 1",
  Reminder_2: "Reminder 2",
} as const;

export const EMPTY_SELECTS_ENUM = {
  Offer: "Choose Offer",
  Theme: "Choose Theme",
};

export const POPULATION_FILTER_TYPES = {
  Round_Based: [
    "Filter_RoundBasedCasino",
    "Filter_RoundBasedSport",
    "Filter_RoundBasedPoker",
  ],
  //TODO: Verify this
  Last_Bet_Date: ["Filter_LastBetDate", "Filter_SportLastBetDate"],
} as const;

export const POPULATION_FILTERS = {
  Sport_Type_Name: "Filter_SportTypeName",
  UP48_Game_Survey: "Filter_UP48GameSurvey",
  UP48_Season_Start: "Filter_UP48SeasonStart",
  Event_Level_2: "Filter_EventLevel2",
  Round_Based_Casino: "Filter_RoundBasedCasino",
  Round_Based_Sport: "Filter_RoundBasedSport",
  Round_Based_Poker: "Filter_RoundBasedPoker",
  Cashback_Casino_Vendors: "Filter_CashbackCasinoVendors",
  Cashback_Casino_Games: "Filter_CashbackCasinoGames",
  SportLastBetDate: "Filter_SportLastBetDate",
  LastBetDate: "Filter_LastBetDate",
} as const;

export const LIMITS = {
  Max_Param_Length: 199,
  Min_Param_Length: 3,
  Max_Segments: 80,
  Max_Params: 30,
};

export const PARAM_TYPES = {
  Cashback_Percent_Amount: "Cashback % Amount",
  Cashback_Cap_Amount: "Cashback Cap Amount",
  Cashback_Final_Amount: "Cashback Final Amount",
  Times: "Times",
  Free_Amount: "Free Amount",
  Max_Free_Amount: "MaxFreeAmount",
};

export const BONUS_TYPES = {
  FPV: "fpv",
  FPS: "fps",
  FIM: "fim",
};

export const OFFER_FIELD_NAMES = {
  Game_List: "Game List",
  Sport_Name: "Sport Name",
  Tournament_Name: "Tournament Name",
  Event_ID: "Event ID",
  External_Plan_ID: "External Plan ID",
  Winning_Offering_Type: "Winning Offering Type",
  Bonus_Offer_Type: "Bonus Offer Type",
  Offer_Game_Group: "Offer Game Group",
  Offer_Package_ID: "Offer Package ID",
  Expiration_Date: "Expiration Date",
  Number_of_Tickets: "Number of Tickets",
} as const;

export const OFFER_TYPES = {
  Free_Bet_1: "Free Bet 1",
  Free_Bet_2: "Free Bet 2",
  Free_Bet_3: "Free Bet 3",
  Free_Bet_4: "Free Bet 4",
  Spectate_Free_Bet_1: "Spectate Free Bet 1",
  Spectate_Free_Bet_2: "Spectate Free Bet 2",
  Spectate_Free_Bet_3: "Spectate Free Bet 3",
  Spectate_Free_Bet_4: "Spectate Free Bet 4",
  TRT_1: "TRT 1",
  TRT_2: "TRT 2",
  TRT_3: "TRT 3",
  TRT_4: "TRT 4",
  IMM_Bonus: "IMM Bonus",
  Free_Spin_Bonus: "Free Spin Bonus",
  Third_Party_FPS: "3rd Party FPS",
  Free_Play_Voucher: "Free Play Voucher",
} as const;

export const OFFER_TYPES_CONVERSION = {
  "Free Bet 1": "fbt1",
  "Free Bet 2": "fbt2",
  "Free Bet 3": "fbt3",
  "Free Bet 4": "fbt4",
  "Spectate Free Bet 1": "sfb1",
  "Spectate Free Bet 2": "sfb2",
  "Spectate Free Bet 3": "sfb3",
  "Spectate Free Bet 4": "sfb4",
  "TRT 1": "trt1",
  "TRT 2": "trt2",
  "TRT 3": "trt3",
  "TRT 4": "trt4",
  "IMM Bonus": "fim",
  "Free Spin Bonus": "fps",
  "3rd Party FPS": "3rdfps",
  "Free Play Voucher": "fpv",
} as const;

export const COMPLEX_OFFER_TYPES = {
  "Free Bet 1": 1,
  "Free Bet 2": 2,
  "Free Bet 3": 3,
  "Free Bet 4": 4,
  "Spectate Free Bet 1": 1,
  "Spectate Free Bet 2": 2,
  "Spectate Free Bet 3": 3,
  "Spectate Free Bet 4": 4,
  "TRT 1": 1,
  "TRT 2": 2,
  "TRT 3": 3,
  "TRT 4": 4,
};

export const CAMPAIGN_STATUSES_OBJ = {
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

export const CAMPAIGN_STATUSES = {
  Draft: "Draft",
  In_Progress: "Ready For Tyson",
  Ready_For_Tyson: "Ready For Tyson",
  In_Queue: "Campaign Created",
  Campaign_Created: "Campaign Created",
  Test_Pending_Approval: "Test Pending Approval",
  Approved_For_Production: "Approved For Prod",
  Error: "Error",
  In_Prod: "In Prod",
  Completed: "Completed",
  Launched: "Launched",
  For_Cancellation: "For Cancellation",
  Canceled: "Canceled",
};

export const PARAMETER_LEVEL = {
  Campaign: "Campaign",
  Round: "Round",
  Theme: "Theme",
  Offer: "Offer",
  //TODO: Align this
  Configuration: "Communication",
  None: "",
};

export const PROMO_META_CLASSIFICATIONS = {
  Description: "Description",
  Title: "Title",
  URL: "URL",
  Type: "Type",
};

export const PROMO_CONFIG_CLASSIFICATIONS = {
  Segment_Inject: "Segment Inject",
  Name: "Name",
  Template_Name: "Template Name",
  URL: "URL",
};

//TODO: Divide into individual objects per group (image, cta and text)
export const PROMO_PAGE_CLASSIFICATIONS = {
  Mobile_Image: "Mobile Image",
  Desktop_Image: "Desktop Image",
  Text: "Text",
  Label: "Label",
  CTA_Script: "CTA_Script",
  Description: "Description",
  Title: "Title",
  URL: "URL",
  Type: "Type",
};

export const REQUIRED_PROMO_META_CLASSIFICATIONS = [];
export const REQUIRED_PROMO_CONFIG_CLASSIFICATIONS = ["Name", "Template Name"];
export const REQUIRED_PROMO_IMAGE_CLASSIFICATIONS = [
  "Mobile Image",
  "Desktop Image",
];
export const REQUIRED_PROMO_TEXT_CLASSIFICATIONS = ["Text"];
export const REQUIRED_PROMO_CTA_CLASSIFICATIONS = ["Label"];

export const CONFIGURATION_TYPES_CONVERSION = {
  "Promocode Config": "promocodeConfig",
  "Neptune Config": "neptuneConfig",
  "Pacman Config": "pacmanConfig",
  "Neptune Bind": "neptuneBind",
  Banner: "banner",
  Omg: "omg",
  Email: "email",
  SMS: "sms",
  Push: "push",
  Neptune: "neptune",
  "Neptune Opt-In": "neptuneOptIn",
  "Remove Neptune": "removeNeptune",
  "Segment Filter": "segmentFilter",
} as const;

export const CONFIGURATION_TYPES_FIELD_NAMES = {
  Banner: [
    "banner_casinoId",
    "banner_pokerId",
    "banner_sportId",
    "banner_777Id",
    "banner_durationStartDay",
    "banner_scheduleStartHour",
    "banner_durationEndDay",
    "banner_scheduleEndHour",
  ],
  Omg: ["omg_scheduleHour", "omg_templateId"],
  Email: ["email_scheduleHour", "email_templateId"],
  SMS: ["sms_scheduleHour", "sms_templateId"],
  Push: ["push_scheduleHour", "push_templateId"],
  Neptune: ["neptune_id"],
  "Neptune Opt-In": ["neptuneOptin_id"],
  "Remove Neptune": ["removeNeptune_id"],
} as const;

export const CONFIGURATION_TYPES = {
  Promocode_Config: "Promocode Config",
  Neptune_Config: "Neptune Config",
  Pacman_Config: "Pacman Config",
  Neptune_Bind: "Neptune Bind",
  Banner: "Banner",

  Promotion_Image: "Promotion Image",
  Promotion_CTA: "Promotion CTA",
  Promotion_Text: "Promotion Text",
  Promotion_Config: "Promotion Config",
  Promotion_Meta: "Promotion Meta",

  OMG: "Omg",
  Email: "Email",
  SMS: "SMS",
  Push: "Push",
  Personal_Hologram: "Personal Hologram",

  Segment_Filter: "Segment Filter",

  Neptune: "Neptune",
  Neptune_Opt_In: "Neptune Opt-In",
  Remove_Neptune: "Remove Neptune",
} as const;

export const FIELDS_BANNER = {
  Banner_Schedule_End_Hour: "banner_scheduleEndHour",
  Banner_Schedule_Start_Hour: "banner_scheduleStartHour",
  Banner_Duration_Start_Day: "banner_durationStartDay",
  Banner_Duration_End_Day: "banner_durationEndDay",
};

export const CLASSIFICATION_TO_FIELD_ID = {
  "Mobile Image": "imageLinkMobileReference",
  "Desktop Image": "imageLinkDesktopReference",
  Text: "text",
  Label: "label",
  "CTA Script": "ctaScript",
  Description: "description",
  Title: "title",
  URL: "url",
  Type: "type",
};
export const META_CLASSIFICATION_TO_FIELD_ID = {
  Description: "og:description",
  Title: "og:title",
  URL: "og:url",
  Type: "og:type",
};
export const CONFIG_CLASSIFICATION_TO_FIELD_ID = {
  "Segment Inject": "segmentInject",
  Name: "name",
  "Template Name": "templateName",
  URL: "url",
};

export const FIELDS_EMAIL = {
  Email_Template_ID: "email_templateId",
  Email_Schedule_Hour: "email_scheduleHour",
};

export const FIELDS_OMG = {
  OMG_Template_ID: "omg_templateId",
  OMG_Schedule_Hour: "omg_scheduleHour",
} as const;
export const FIELDS_PUSH = {
  Push_Template_ID: "push_templateId",
  Push_Schedule_Hour: "push_scheduleHour",
};
export const FIELDS_SMS = {
  SMS_Template_ID: "sms_templateId",
  SMS_Schedule_Hour: "sms_scheduleHour",
};
export const FIELDS_NEPTUNE_ID = {
  Neptune_ID: "neptune_id",
};
export const FIELDS_NEPTUNE_OPT_IN_ID = {
  Neptune_Opt_In_ID: "neptuneOptin_id",
};
export const FIELDS_REMOVE_NEPTUNE_ID = {
  Neptune_Remove_Neptune_ID: "removeNeptune_id",
};

export const FIELDS_SEGMENT_FILTER = {
  Cashback_Total_Bet_Seg: "cashbackTotalBetSeg",
  Cashback_Base_Sum: "cashbackBaseSum",
};

export const FIELDS_HOLOGRAM = {
  Casino_Hologram_ID: "casinoHologramID",
  Poker_Hologram_ID: "pokerHologramID",
  Triple_Seven_Hologram_ID: "tripleSevenHologramID",
  Sport_Hologram_ID: "sportHologramID",
  Duration_Start_Day: "durationStartDay",
  Duration_End_Day: "durationEndDay",
  Schedule_Start_Hour: "scheduleStartHour",
  Schedule_End_Hour: "scheduleEndHour",
};

export const FIELDS_PROMOCODE_CONFIG = {
  Template_ID: "templateId",
  Duration_Days: "durationDays",
  Bonus_Percentage: "bonusPercentage",
  Games: "games",
  Email_Parameter: "emailParams",
  OMG_Parameter: "omgParams",
};

export const FIELDS_NEPTUNE_CONFIG = {
  Campaign_Template: "campaignTemplate",
  Rule_Template: "ruleTemplate",
  Neptune_Type: "neptuneType",
  Neptune_Duration: "neptuneDuration",
  Into_Neptune: "intoNeptune",
  Duration_Start_Day: "durationStartDay",
  Duration_Start_Hour: "durationStartHour",
  Duration_End_Day: "durationEndDay",
  Duration_End_Hour: "durationEndHour",
  Rule_Completed: "ruleCompleted",
  Condition_Value: "conditionValue",
  Grant_Pacman: "grantPacman",
  Filter_Games_List: "filter_gamesList", //comma-sep
  Filter_Game_Groups: "filter_gameGroups", //comma-sep
  Filter_Casino_Bet_Amount: "filter_casinoBetAmount", //num
  Filter_Sport_Bet_Amount: "filter_sportBetAmount", //num
  Filter_Sport_Bet_Odds: "filter_sportBetOdds", //num
  Filter_Combination_Bet_Odds: "filter_combinationBetOdds", //num
  Filter_Spectate_Sport_Tournament: "filter_spectateSportTournament", //comma-sep
  Filter_Spectate_Event_ID: "filter_spectateEventId", //comma-sep
  Filter_Spectate_Sport_Type: "filter_spectateSportType", //comma-sep
  Filter_Game_Categories: "filter_gameCategories", //comma-sep
  Filter_Number_Of_Legs: "filter_numberOfLegs", //comma-sep
};

export const FIELDS_PACMAN_CONFIG = {
  Promo_Templates: "promoTemplates",
  Promo_Description: "promoDescription",
  Bonus_Description: "bonusDesc",
  Duration_Days: "durationDays",
  Bonus_Percentage: "bonusPercentage",
  Games: "games",
  Email_Parameter: "emailParams",
  OMG_Parameter: "omgParams",
  Company: "company",
};

export const PROMOTION_PAGE_VALUE_SOURCE = {
  imageLinkMobileReference: "file",
  imageLinkDesktopReference: "file",
  text: "file-first",
};

export const PROMOTION_PAGE_TYPES = {
  "Promotion Image": "image",
  "Promotion CTA": "cta",
  "Promotion Text": "text",
  "Promotion Meta": "meta",
  "Promotion Config": "config",
}

export const ALL_CONFIG_CLASSIFICATIONS = {
  Email_Parameter: "Email Parameter",
  OMG_Parameter: "OMG Parameter",
};

export const COLUMN_GROUP = {
  Market: "Market",
  Additional_Data: "Additional Data",
  Population_Filter: "Population Filter",
  None: "",
};
export const CONFIGURATION_COLUMN_NAMES = {
  Classification: "Classification",
  Field_Id: "Field_Id",
  Value: "Value",
  Files: "Files",
};
