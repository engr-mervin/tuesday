import {
  OFFER_TYPES,
  OFFER_TYPES_CONVERSION,
} from "../constants/infraConstants";

export interface PromotionPage {
  meta: Record<MetaField, string>;
  config: Record<ConfigField, string>;
  components: Component[];
}

type MetaField =
  | "og:title"
  | "og:url"
  | "og:description"
  | "description"
  | "og:type"
  | "og:updated_time";
type ConfigField =
  | "segmentInject"
  | "templateName"
  | "name"
  | "path"
  | "url"
  | "folderName";

export interface Component {
  componentName: string;
  componentType: ComponentType;
  componentMeta: {
    [key: string]: string;
  };
}

type ComponentType = "text" | "image" | "cta";

export interface GeneratePromoPage {
  _TemplateName: string;
  _Url: string;
  _Name: string;
  _ComponentList: Record<string, ComponentImage | ComponentText | ComponentCTA>;
  _articalData: Record<string, any>;
  _Path: string;
  _metaData: MetaData;
  _navTitle: string;
  _title: string;
}

interface MetaData {
  description: string;
  "og:title": string;
  "og:url": string;
  "og:type": "Website" | string;
  "og:description": string;
  "og:updated_time": string;
}

interface ComponentImage {
  imageLinkDesktopReference: string;
  imageLinkMobileReference: string;
  mediaSelect: "image";
  __componentType: "image";
  _resourceType: string;
  [key: string]: string;
}

type Headings = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
interface ComponentText {
  fontColor: string;
  fontWeight: string;
  headingStyle: Headings;
  textIsRich: "true" | "false";
  textTitle: string;
  type: Headings;
  id: string;
  paddingBottom: string;
  __componentType: "text";
  _resourceType: string;
  [key: string]: string;
}

interface ComponentCTA {
  type: string;
  flexAlignment: string;
  fontSize: string;
  label: string;
  ariaLabel: string;
  url: string;
  newWindow: boolean;
  __componentType: "cta";
  _resourceType: string;
  [key: string]: string | boolean;
}

export interface GeneratePageResult {
  status: "Created" | "Failed" | "Exist";
  statusMessage: "The page was created successfully" | string;
  [key: string]: string;
}

export interface CampaignDetailsResponse {
  hasError: boolean;
  errMsg: string;
  data: DetailsData | null;
}

export interface DetailsData {
  details: Details;
  rounds: RoundObject[];
  closedPopulation: ClosedPopulation;
  promotionPage: PromotionPage;
}

export interface Details {
  id: string;
  name: string;
  offer: string;
  theme: string;
  startDate: string;
  endDate: string;
  status: string;
  ab: number | null;
  controlGroup: null | string;
  regulations: Regulation[];
  isOneTimeCampaign: boolean | undefined;
  tiers: any;
  personEmail: string;
}

export interface ClosedPopulation {
  type: string;
  values: any[];
}

interface Regulation {
  name: string;
  isChecked: boolean;
}

export interface Filter {
  name: string;
  value: string;
}

export interface RoundObject {
  itemId: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  parameters: Parameter[]; // This may change due to monday infra offer repo per campaign so no strict type
  isOneTimeRound: boolean;
  bonuses: Bonuses | null;
  populationFilters: Filter[] | null;
  communications: Communications | null;
}

export interface Parameter {
  "Param Name": string;
  "Param Type": string;
  [key: string]: string | null;
}

export interface Bonuses {
  bonusesCnt: number;
  list: Bonus[];
  validation: {
    hasError: boolean;
    message: string[];
  };
}

export interface Bonus {
  type: (typeof OFFER_TYPES_CONVERSION)[keyof typeof OFFER_TYPES_CONVERSION];
  name: keyof typeof OFFER_TYPES_CONVERSION;
  segments: BonusSegment[];
}

export interface BonusSegment {
  segmentName: string;
  bonusValues: { [key in keyof typeof OFFER_TYPES]: string | string[] };
}

interface SegmentFilters {
  cashbackBaseSum: string;
  cashbackTotalBetSeg: string;
}

export interface Communications {
  omg: Communication<OMGComm>;
  email: Communication<EmailComm>;
  sms: Communication<SMSComm>;
  push: Communication<PushComm>;
  neptune: Communication<NeptuneComm>;
  neptuneOptIn: Communication<NeptuneOptInComm>;
  removeNeptune: Communication<RemoveNeptuneComm>;
  segmentFilter?: Record<string, SegmentFilters>;
  banner?: Communication<BannerComm>;

  promocodeConfig?: PacmanConfig;
  neptuneBind?: NeptuneBind;
  neptuneConfig?: NeptuneConfig;
  pacmanConfig?: NeptunePacmanConfig;
}

export interface NeptuneBind {
  [key: string]: {
    neptuneId: string;
  };
}
interface NeptuneConfig {
  neptunes: NeptuneDetails;
}
interface NeptunePacmanConfig {
  pacmans: NeptunePacmanDetails;
}
export interface NeptuneDetails {
  [key: string]: NestedCommField<NeptuneFields>[];
}

type NeptuneFields =
  | "campaignTemplate"
  | "ruleTemplate"
  | "intoNeptune"
  | "durationStartDay"
  | "durationStartHour"
  | "durationEndDay"
  | "durationEndHour"
  | "ruleCompleted"
  | "conditionValue"
  | "filter_sportBetAmount"
  | "filter_sportBetOdds"
  | "filter_casinoBetAmount"
  | "grantPacman"
  | "filter_gamesList"
  | "filter_gameGroups"
  | "filter_combinationBetOdds"
  | "filter_spectateSportTournament"
  | "filter_spectateEventId"
  | "filter_spectateSportType"
  | "filter_gameCategories"
  | "neptuneType"
  | "neptuneDuration"
  | "filter_numberOfLegs";

type NeptunePacmanFields =
  | "promoTemplates"
  | "promoDescription"
  | "bonusDesc"
  | "durationDays"
  | "bonusPercentage"
  | "games"
  | "emailParams"
  | "omgParams"
  | "company";

export type NeptunePacmanCommField = NestedCommField<NeptunePacmanFields>;

export interface NeptunePacmanDetails {
  [key: string]: NestedCommField<NeptunePacmanFields>[];
}

type Communication<CommType> = CommId & CommSegs<CommType>;

interface CommId {
  id?: number;
}

interface CommSegs<CommType> {
  [key: string]: CommType;
}

type CommValue = string | undefined | null;

interface OMGComm {
  omg_scheduleHour: CommValue;
  omg_templateId: CommValue;
}
interface EmailComm {
  email_scheduleHour: CommValue;
  email_templateId: CommValue;
}
interface SMSComm {
  sms_scheduleHour: CommValue;
  sms_templateId: CommValue;
}
interface PushComm {
  omg_scheduleHour: CommValue;
  omg_templateId: CommValue;
}

interface NeptuneComm {
  neptune_id: CommValue;
}

interface RemoveNeptuneComm {
  removeNeptune_id: CommValue;
}

interface NeptuneOptInComm {
  neptuneOptin_id: CommValue;
}

interface BannerComm {
  banner_casinoId: CommValue;
  banner_pokerId: CommValue;
  banner_sportId: CommValue;
  banner_777Id: CommValue;
  banner_durationStartDay: CommValue;
  banner_scheduleStartHour: CommValue;
  banner_durationEndDay: CommValue;
  banner_scheduleEndHour: CommValue;
}
interface PacmanConfig {
  [key: string]: PromotionsDetails; // Regulation: { "Promocode": NestedCommField[] }
}

interface PromotionsDetails {
  // Represents a record with nested communication
  [key: string]: NestedCommField<string>[];
}
interface NestedCommField<T> {
  // Represents a sub item in nested comm
  name: string;
  fieldKey: T | null;
  value: string;
  interfaceification: string;
}
export interface ParamObj {
  [key: string]: CommunicationParam[];
}

export interface CommunicationParam {
  paramName: string;
  paramValue: string;
}

//Neptune
export type SaveNeptunePacmanResponse =
  | SaveNeptunePacmanResponseSuccess
  | SaveNeptunePacmanResponseFail;
export interface SaveNeptunePacmanResponseSuccess {
  status: "success";
  pacmanName: string;
  pacmanId: number;
}
export interface SaveNeptunePacmanResponseFail {
  status: "fail";
  message: string;
}
