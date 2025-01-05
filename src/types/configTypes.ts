//Union of types with the type as
//discriminant
//Will include neptune/pacman/promocode/promotion page/banner/etc

import { CONFIGURATION_TYPES } from "../constants/infraConstants";
import { Round } from "./campaignTypes";

//TODO:
//MondayOptionalField add undefined
//MondayRequiredField (string | null)
export interface ConfigItemField {
  name: string;
  classification: string;
  fieldId: string;
  value: string;
  //Only this field is optional
  files: string | undefined;
}

export interface ConfigItem {
  name: string;
  round: string;
  type: string;
  fieldName: string;
  segments: Record<string, string>;
  //Optional for record with no subitems
  fields?: ConfigItemField[];
}


export interface ValidatedConfigItem {
    name: string;
    round: Round;
    type: keyof typeof CONFIGURATION_TYPES;
    fieldName: string;
    segments: Record<string, string>;
    //Optional for record with no subitems
    fields?: ConfigItemField[];
}