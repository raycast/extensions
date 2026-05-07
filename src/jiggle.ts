import { execFile } from "child_process";
import { promisify } from "util";
import { showToast, Toast, LaunchProps } from "@raycast/api";

const execFileAsync = promisify(execFile);

interface JiggleArguments {
  intensity?: string;
}

export default async function JiggleMouse({
  arguments: args,
}: LaunchProps<{ arguments: JiggleArguments }>) {
  const intensity = parseInt(args.intensity || "10", 10);
  const clampedIntensity = Math.min(Math.max(intensity, 5), 20);

  try {
    // Generate random offsets
    const offsets: [number, number][] = [];
    for (let i = 0; i < 4; i++) {
      offsets.push([
        Math.floor(Math.random() * (clampedIntensity * 2 + 1)) -
          clampedIntensity,
        Math.floor(Math.random() * (clampedIntensity * 2 + 1)) -
          clampedIntensity,
      ]);
    }

    // Check for cliclick
    const hasCliclick = await checkCliclick();

    if (hasCliclick) {
      // Use cliclick for smooth mouse movement (r: for relative movement)
      for (const [dx, dy] of offsets) {
        await execFileAsync("cliclick", [`r:${dx},${dy}`]);
        await new Promise((r) => setTimeout(r, 50));
      }
    } else {
      // Use Python fallback
      const pythonScript = generatePythonScript(offsets);
      await execFileAsync("/usr/bin/python3", ["-c", pythonScript]);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Mouse Jiggled!",
      message: `Moved in ${offsets.length} random steps`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to jiggle mouse",
      message: String(error),
    });
  }
}

async function checkCliclick(): Promise<boolean> {
  try {
    await execFileAsync("which", ["cliclick"]);
    return true;
  } catch {
    return false;
  }
}

function generatePythonScript(offsets: [number, number][]): string {
  const moves = offsets
    .map(([dx, dy]) => `move_mouse(${dx}, ${dy})`)
    .join("\n");

  return `import Quartz
import time

def move_mouse(dx, dy):
    event = Quartz.CGEventCreate(None)
    loc = Quartz.CGEventGetLocation(event)
    new_loc = Quartz.CGPoint(loc.x + dx, loc.y - dy)
    move_event = Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventMouseMoved, new_loc, Quartz.kCGMouseButtonLeft)
    if move_event:
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, move_event)

${moves}
`;
}
