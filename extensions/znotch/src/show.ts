import { Action, manage } from "./manage";

export default async () => {
  await manage(Action.Show, "notch is shown");
};
