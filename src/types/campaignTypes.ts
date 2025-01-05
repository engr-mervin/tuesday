import { User } from "monstaa/dist/classes/User";
import { CAMPAIGN_STATUSES } from "../constants/infraConstants";
import { DropdownCellValue, NumberCellValue } from "monstaa/dist/classes/Cell";
import { Optional } from "./generalTypes";

//Get fields will validate existence,
//Validation will validate validity of values
export interface CampaignFields {
  name: string;
  startDate: string | null;
  endDate: string | null;
  ab: Optional<NumberCellValue>;
  tiers: Optional<DropdownCellValue>; //Basis for requiring tiers is the existence of key in infra config
  controlGroup: Optional<NumberCellValue>;
  regulations: Record<string, boolean>;
  status: string;
  user: User | null;
  theme: string;
  offer: string;
  isOneTime: Optional<boolean>;
  populationFilters: Record<
    string,
    {
      value: string;
      type: string;
    }
  >;
}


export interface ValidatedCampaignFields {
  name: string;
  startDate: string;
  endDate: string;
  ab: Optional<number>;
  tiers: Optional<string[]>; //Basis for requiring tiers is the existence of key in infra config
  controlGroup: Optional<number>;
  regulations: Record<string, boolean>;
  status: keyof typeof CAMPAIGN_STATUSES;
  user: User;
  theme: string;
  offer: string;
  isOneTime: Optional<boolean>;
  populationFilters: Record<
    string,
    {
      value: string;
      type: string;
    }
  >;
}
