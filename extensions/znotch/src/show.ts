import { Action, manage } from "./manage";

export default async () => {
  await manage(Action.Show, "Notch is shown");
};
