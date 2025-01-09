import { OFFER_TYPES } from "../constants/infraConstants.js";
import { BaseParameter } from "./campaignTypes.js";
export interface BonusOfferItem extends BaseParameter {
  useAsCom: boolean | undefined;
  bonusType: string;
  bonusFieldName: string;
  isFragment: boolean;
}

export type GetOfferResult =
  | {
      isBonus: true;
      offers: BonusOfferItem[];
    }
  | {
      isBonus: false;
      offers: NonBonusOfferItem[];
    };

export interface NonBonusOfferItem extends BaseParameter {
  useAsCom: boolean | undefined;
  bonusType: undefined;
  bonusFieldName: undefined;
  isFragment: boolean;
}

export type ValidatedOfferItem =
  | ValidatedBonusOfferItem
  | ValidatedNonBonusOfferItem;

export interface ValidatedBonusOfferItem extends BaseParameter {
  useAsCom: boolean | undefined;
  bonusType: (typeof OFFER_TYPES)[keyof typeof OFFER_TYPES];
  bonusFieldName: string;
  isFragment: boolean;
}
export interface ValidatedNonBonusOfferItem extends BaseParameter {
  useAsCom: boolean | undefined;
  bonusType: undefined;
  bonusFieldName: undefined;
  isFragment: boolean;
}
