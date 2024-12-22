export interface CampaignFields {
  name: Field<string>;
  startDate: Field<string>;
  endDate: Field<string>;
  ab: Field<number>;
  tiers: Field<string[]>;
  controlGroup: Field<number>;
  regulations: Record<string, boolean>;
  status: Field<string>;
  personId: Field<string>;
  theme: Field<string>;
  offer: Field<string>;
  isOneTime: Field<boolean>;
}
export type Field<T> = T | undefined | null;
export type RequiredField<T> = T | null; //Means it should be configured

export interface ValidatedCampaignFields {
  name: Field<string>;
  startDate: Field<string>;
  endDate: Field<string>;
  ab: Field<number>;
  tiers: Field<string[]>;
  controlGroup: Field<number>;
  regulations: Record<string, boolean>;
  status: Field<string>;
  personId: Field<string>;
  theme: Field<string>;
  offer: Field<string>;
  isOneTime: Field<boolean>;
}
