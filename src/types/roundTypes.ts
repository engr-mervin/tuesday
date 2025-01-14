import { DateCellValue, HourCellValue } from "monstaa/dist/classes/Cell.js";
import { Optional } from "./generalTypes.js";

export interface RoundFields {
  name: string;
  itemId: number;
  roundType: string;
  startDate: DateCellValue;
  endDate: DateCellValue;
  emailScheduleHour: Optional<HourCellValue>;
  SMSScheduleHour: Optional<HourCellValue>;
  OMGScheduleHour: Optional<HourCellValue>;
  pushScheduleHour: Optional<HourCellValue>;
  isOneTime: Optional<boolean>;
  tysonRound: string;
}
export interface ValidatedRoundFields {
  name: string;
  itemId: number;
  roundType: "Intro" | "Reminder 1" | "Reminder 2";
  startDate: string;
  endDate: DateCellValue;
  emailScheduleHour: Optional<HourCellValue>;
  SMSScheduleHour: Optional<HourCellValue>;
  OMGScheduleHour: Optional<HourCellValue>;
  pushScheduleHour: Optional<HourCellValue>;
  isOneTime: Optional<boolean>;
  tysonRound: string;
}
