import { showHUD, showToast, Toast } from "@raycast/api";
import { EditorManager } from "../services/EditorManager";
import { getEditorConfig } from "./constants";

export async function validateAllConfigurations() {
  const editorManager = new EditorManager();

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Validating configurations...",
    });

    const validationResults = await editorManager.validateAllConfigurations();

    let totalErrors = 0;
    let totalWarnings = 0;
    let validEditors = 0;
    let totalEditors = 0;

    const resultMessages: string[] = [];

    for (const [editorType, result] of validationResults) {
      totalEditors++;
      const editorConfig = getEditorConfig(editorType);

      if (result.isValid) {
        validEditors++;
        resultMessages.push(`${editorConfig.displayName}: Valid`);
      } else {
        totalErrors += result.errors.length;
        totalWarnings += result.warnings?.length || 0;

        resultMessages.push(
          `${editorConfig.displayName}: ${result.errors.length} error${result.errors.length !== 1 ? "s" : ""}`,
        );

        result.errors.slice(0, 3).forEach((error) => {
          resultMessages.push(`   • ${error.message}`);
        });

        if (result.errors.length > 3) {
          resultMessages.push(`   • ... and ${result.errors.length - 3} more errors`);
        }
      }
    }

    if (totalErrors === 0) {
      await showHUD(`All configurations valid!\n${validEditors}/${totalEditors} editors validated successfully`);
    } else {
      const summary = `Validation failed!\n${totalErrors} error${totalErrors !== 1 ? "s" : ""} found across ${totalEditors - validEditors} editor${totalEditors - validEditors !== 1 ? "s" : ""}`;

      await showToast({
        style: Toast.Style.Failure,
        title: "Configuration validation failed",
        message: `${totalErrors} error${totalErrors !== 1 ? "s" : ""}, ${totalWarnings} warning${totalWarnings !== 1 ? "s" : ""}`,
      });

      console.log("MCP Configuration Validation Results:");
      console.log("=====================================");
      resultMessages.forEach((message) => console.log(message));

      await showHUD(summary);
    }
  } catch (error) {
    console.error("Failed to validate configurations:", error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Validation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });

    await showHUD("Configuration validation failed");
  }
}
