import { Authenticated } from "./components/authenticated";
import { PresetList } from "./components/preset/presetList";

export default function PresetsCommand(): JSX.Element {
  return (
    <Authenticated>
      <PresetList />
    </Authenticated>
  );
}
