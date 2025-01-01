import { User } from "monstaa/dist/classes/User";
import { CAMPAIGN_STATUSES } from "../constants/INFRA";

//Get fields will validate existence,
//Validation will validate validity of values
export interface CampaignFields {
  name: RequiredField<string>;
  startDate: RequiredField<string>;
  endDate: RequiredField<string>;
  ab: Field<number>;
  tiers: Field<string[]>;
  controlGroup: Field<number>;
  regulations: Record<string, boolean>;
  status: RequiredField<string>;
  user: RequiredField<User | null>;
  theme: Field<string>;
  offer: Field<string>;
  isOneTime: Field<boolean>;
  populationFilters: Record<
    string,
    {
      value: string;
      type: string;
    }
  >;
}
export type Field<T> = T | undefined | null;
export type RequiredField<T> = T; //Means it should be configured

export type Round = "Intro" | "Reminder 1" | "Reminder 2" | "Reminder 3";

export interface ValidatedCampaignFields {
  name: Field<string>;
  startDate: Field<string>;
  endDate: Field<string>;
  ab: Field<number>;
  tiers: Field<string[]>;
  controlGroup: Field<number>;
  regulations: Record<string, boolean>;
  status: keyof typeof CAMPAIGN_STATUSES;
  user: RequiredField<User>;
  theme: Field<string>;
  offer: Field<string>;
  isOneTime: Field<boolean>;
  populationFilters: Record<
    string,
    {
      value: string;
      type: string;
    }
  >;
}
