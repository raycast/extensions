import { environment } from "@raycast/api";
import Fs from "fs";

function ReadConfig(): string {
  try {
    const config_path = `${environment.supportPath}/zoom_mapping.json`;
    if (!Fs.existsSync(config_path)) {
      console.log("Config file not found. Creating...");
      WriteConfig("[]");
    }
    const config = Fs.readFileSync(`${environment.supportPath}/zoom_mapping.json`, "utf-8");
    console.debug("Successfully read config");
    return config;
  } catch (err) {
    console.error(err);
    return "";
  }
}

function WriteConfig(config: string): void {
  try {
    Fs.writeFileSync(`${environment.supportPath}/zoom_mapping.json`, config);
    console.debug("Successfully wrote config");
  } catch (err) {
    console.error(err);
  }
}

export { ReadConfig, WriteConfig };
