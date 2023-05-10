import { LaunchProps, showToast, Toast, confirmAlert } from "@raycast/api";
import { exec } from "child_process";

interface Arguments {
  URL: string;
}

function openUrl(url: string) {
  exec(`open ${url}`);
}

async function executeCommand(command: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    exec(command, async (error, stdout, stderr) => {
      // If yt-dlp is not installed, prompt the user to install it
      if (error && error.code === 127) {
        if (
          await confirmAlert({
            title: "It looks like you don't have yt-dlp installed. Please install it and try again!",
          })
        ) {
          openUrl("https://github.com/yt-dlp/yt-dlp/wiki/Installation");
        }
        reject();
      }

      showToast({
        style: Toast.Style.Animated,
        title: "Downloading...",
      });

      // poll to see if the download is complete
      function checkStatus() {
        if (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Execution Error:",
            message: error.message,
          });
          reject();
        }

        if (stderr) {
          showToast({
            style: Toast.Style.Failure,
            title: "yt-dlp Error:",
            message: stderr,
          });
          reject();
        }

        if (stdout.includes("100%")) {
          showToast({
            style: Toast.Style.Success,
            title: "Download Complete!",
            message: "The video is in your Downloads folder.",
          });
          resolve();
        }
      }

      const intervalId = setInterval(checkStatus, 1000);
    });
  });
}

export default async function main(props: LaunchProps<{ arguments: Arguments }>) {
  const { URL } = props.arguments;
  const command = `cd ~/Downloads && yt-dlp "${URL}"`;

  try {
    await executeCommand(command);
  } catch (error) {
    console.error(error);
  }
}
