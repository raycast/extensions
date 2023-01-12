import { Action, manage } from "./manage";

export default async () => {
  await manage(Action.Toggle, "notch toggled");
};
