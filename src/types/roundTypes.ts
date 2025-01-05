import { DateCellValue, HourCellValue } from "monstaa/dist/classes/Cell";
import { Optional } from "./generalTypes";

export interface RoundFields {
  name: string;
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
