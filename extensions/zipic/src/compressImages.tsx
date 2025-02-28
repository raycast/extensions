import { showToast, Toast, getSelectedFinderItems } from "@raycast/api";
import { exec } from "child_process";
import { checkZipicInstallation } from "./utils/checkInstall";

export default async function main() {
  const isInstalled = await checkZipicInstallation();
  if (!isInstalled) {
    return;
  }

  let filePaths: string[];

  try {
    // 获取选中的文件
    filePaths = (await getSelectedFinderItems()).map((f) => f.path);
    if (filePaths.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Warning! No Finder items selected",
      });
      return;
    }

    // 构建 URL 参数，只包含文件路径
    let urlParams = "";

    // 添加所有文件路径作为 url 参数
    filePaths.forEach((path) => {
      urlParams += `url=${encodeURIComponent(path)}&`;
    });

    // 移除最后一个 & 符号
    if (urlParams.endsWith("&")) {
      urlParams = urlParams.slice(0, -1);
    }

    const url = `zipic://compress?${urlParams}`;

    await showToast({
      style: Toast.Style.Success,
      title: "Compressing with Zipic",
      message: "Using Zipic app settings",
    });

    exec(`open "${url}"`);
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: e instanceof Error ? e.message : "Could not get the selected Finder items",
    });
  }
}
