import { OFFER_TYPES } from "../constants/infraConstants";
export type BonusOfferItem = {
  parameterName: string;
  useAsCom: boolean | undefined;
  parameterType: string;
  bonusType: string;
  bonusFieldName: string;
  isFragment: boolean;
  values: {
    [key: string]: string;
  };
};

export type GetOfferResult = {
  isBonus: true,
  offers: BonusOfferItem[]
} | {
  isBonus: false,
  offers: NonBonusOfferItem[]
}

export type NonBonusOfferItem = {
  parameterName: string;
  useAsCom: boolean | undefined;
  parameterType: string;
  bonusType: undefined;
  bonusFieldName: undefined;
  isFragment: boolean;
  values: {
    [key: string]: string;
  };
};

export type ValidatedOfferItem =
  | ValidatedBonusOfferItem
  | ValidatedNonBonusOfferItem;

export type ValidatedBonusOfferItem = {
  parameterName: string;
  useAsCom: boolean | undefined;
  parameterType: string;
  bonusType: typeof OFFER_TYPES[keyof typeof OFFER_TYPES];
  bonusFieldName: string;
  isFragment: boolean;
  values: {
    [key: string]: string;
  };
};
export type ValidatedNonBonusOfferItem = {
  parameterName: string;
  useAsCom: boolean | undefined;
  parameterType: string;
  bonusType: undefined;
  bonusFieldName: undefined;
  isFragment: boolean;
  values: {
    [key: string]: string;
  };
};
