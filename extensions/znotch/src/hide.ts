import { Action, manage } from "./manage";

export default async () => {
  await manage(Action.Hide, "Notch is hidden");
};
