//Union of types with the type as
//discriminant
//Will include neptune/pacman/promocode/promotion page/banner/etc

import { FileCellValue } from "monstaa/dist/classes/Cell.js";
import { CONFIGURATION_TYPES } from "../constants/infraConstants.js";
import { Round } from "../validators/roundValidators.js";

//TODO:
//MondayOptionalField add undefined
//MondayRequiredField (string | null)
export interface ConfigItemField {
  name: string;
  classification: string;
  fieldId: string;
  value: string;
  //Only this field is optional
  files: FileCellValue | undefined;
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

export interface ConfigSegments {
  [segmentName: string]: {
    [configType in keyof typeof CONFIGURATION_TYPES]?: {
      fieldName: string;
      value: string;
    }[];
  };
}

export interface ValidatedConfigItem {
  name: string;
  round: Round | 'Promotion Page';
  type: (typeof CONFIGURATION_TYPES)[keyof typeof CONFIGURATION_TYPES];
  fieldName: string;
  segments: Record<string, string>;
  //Optional for record with no subitems
  fields?: ConfigItemField[];
}
