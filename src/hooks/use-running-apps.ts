import { Application, showToast, Toast, confirmAlert, Alert } from "@raycast/api"
import { runAppleScript } from "@raycast/utils"
import { useState, useEffect, useCallback, useMemo } from "react"
import { FolderItem } from "../types"
import { findApplicationByItemPath, pluralize } from "../utils"
import { RUNNING_APPS_POLL_INTERVAL } from "../constants"

/**
 * Hook to track which applications are currently running
 * Polls System Events to check running processes
 */
export function useRunningApps(
  appItems: FolderItem[],
  applications: Application[]
): {
  runningAppPaths: Set<string>
  hasRunningApps: boolean
  quitAllRunningApps: (folderName: string) => Promise<void>
} {
  const [runningAppPaths, setRunningAppPaths] = useState<Set<string>>(new Set())

  const hasApps = appItems.length > 0

  useEffect(() => {
    if (!hasApps) return

    const checkRunningApps = async () => {
      try {
        // Get all running process names in a single AppleScript call
        const result = await runAppleScript(
          `tell application "System Events" to get name of every process`,
          { timeout: 5000 }
        )
        const runningProcesses = new Set(
          result.split(", ").map((name) => name.trim().toLowerCase())
        )

        const running = new Set<string>()
        for (const item of appItems) {
          if (!item.path) continue
          const app = findApplicationByItemPath(item.path, applications)
          const appName = (app?.name || item.name).toLowerCase()

          if (runningProcesses.has(appName)) {
            running.add(item.path)
          }
        }

        setRunningAppPaths((prev) => {
          // Only update if changed to avoid unnecessary re-renders
          if (prev.size !== running.size || ![...prev].every((p) => running.has(p))) {
            return running
          }
          return prev
        })
      } catch {
        // Ignore errors - running apps check is not critical
      }
    }

    checkRunningApps()
    const interval = setInterval(checkRunningApps, RUNNING_APPS_POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [appItems, applications, hasApps])

  const quitAllRunningApps = useCallback(
    async (folderName: string) => {
      if (runningAppPaths.size === 0) return

      const confirmed = await confirmAlert({
        title: "Quit All Running Applications",
        message: `Quit ${runningAppPaths.size} running ${pluralize(runningAppPaths.size, "application")} in "${folderName}"?`,
        primaryAction: {
          title: "Quit All",
          style: Alert.ActionStyle.Destructive,
        },
      })

      if (!confirmed) return

      let success = 0
      let failed = 0
      const count = runningAppPaths.size

      for (const path of runningAppPaths) {
        const app = findApplicationByItemPath(path, applications)
        const appName = app?.name || path.split("/").pop()?.replace(".app", "") || "Unknown"

        try {
          await runAppleScript(`tell application "${appName}" to quit`)
          success++
        } catch {
          failed++
        }
      }

      // Clear running apps immediately for responsive UI
      setRunningAppPaths(new Set())

      if (failed === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "All applications quit",
          message: `Quit ${success} ${pluralize(success, "app")}`,
        })
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: failed === count ? "Failed to quit applications" : "Some apps failed to quit",
          message: `Quit ${success}, failed ${failed}`,
        })
      }
    },
    [runningAppPaths, applications]
  )

  return useMemo(
    () => ({
      runningAppPaths,
      hasRunningApps: runningAppPaths.size > 0,
      quitAllRunningApps,
    }),
    [runningAppPaths, quitAllRunningApps]
  )
}
