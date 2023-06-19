import { PresetEditForm } from "./components/preset/presetEditForm";
import { createPreset } from "./lib/zeitraumClient";

export default function CreatePresetCommand(): JSX.Element {
  return <PresetEditForm onSubmit={createPreset} />;
}
