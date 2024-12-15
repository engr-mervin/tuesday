

export interface OfferItem {
    parameterName: string;
    useAsCom: boolean | undefined;
    parameterType: string;
    bonusType: string | undefined;
    bonusFieldName: string | undefined;
    values: {
      [key: string]: string | null;
    };
  }
  