export interface Prefs {
  airpodsIndex: string; // textfield returns string, will be parsed to number
  airpodsType: "pro" | "max";
  soundLoc: string;
  optionOne: string;
  optionTwo: string;
  showHudNC: boolean;
  showHudCA: boolean;
}
