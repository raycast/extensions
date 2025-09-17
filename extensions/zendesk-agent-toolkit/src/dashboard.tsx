import { Action, ActionPanel, Detail, showToast, Toast, getPreferenceValues } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { zdFetch, getCurrentUserId } from "./zendesk";
import { ticketMonitor } from "./ticket-monitor";
import AISuggestions from "./ai-suggestions";

interface DailyTicketData {
  date: string;
  solved: number;
  submitted: number;
}

interface SystemData {
  system: string;
  count: number;
  percentage: number;
}

interface OpenTicket {
  id: number;
  subject: string;
  updated_at: string;
  priority?: string;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailyTicketData[]>([]);
  const [systemsData, setSystemsData] = useState<SystemData[]>([]);
  const [openTickets, setOpenTickets] = useState<OpenTicket[]>([]);
  const [aiSuggestionsCount, setAISuggestionsCount] = useState<number>(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      await getCurrentUserId(); // Verify auth

      // Get open tickets assigned to you
      const openResponse = await zdFetch<{
        results: Array<{ id: number; subject: string; updated_at: string; priority?: string }>;
      }>(`/api/v2/search.json?query=type:ticket assignee:me status:open`);

      // Generate daily stats for the last 5 days
      const dailyStats = await generateDailyStats();

      // Generate systems breakdown
      const systemsStats = await generateSystemsBreakdown();

      // Check for AI macro suggestions
      const suggestions = await ticketMonitor.checkForResolvedTickets();

      setDailyData(dailyStats);
      setSystemsData(systemsStats);
      setOpenTickets(openResponse.results);
      setAISuggestionsCount(suggestions.length);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load dashboard",
        message: String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function generateDailyStats(): Promise<DailyTicketData[]> {
    const days: DailyTicketData[] = [];

    for (let i = 4; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      try {
        // Get solved tickets for this day
        const solvedResponse = await zdFetch<{ results: Array<{ id: number }> }>(
          `/api/v2/search.json?query=type:ticket assignee:me status:solved solved:${dateStr}`,
        );

        // Get submitted tickets for this day
        const submittedResponse = await zdFetch<{ results: Array<{ id: number }> }>(
          `/api/v2/search.json?query=type:ticket assignee:me created:${dateStr}`,
        );

        days.push({
          date: dateStr,
          solved: solvedResponse.results.length,
          submitted: submittedResponse.results.length,
        });
      } catch {
        days.push({
          date: dateStr,
          solved: 0,
          submitted: 0,
        });
      }
    }

    return days;
  }

  async function generateSystemsBreakdown(): Promise<SystemData[]> {
    try {
      const preferences = getPreferenceValues<{
        systemFieldId?: string;
      }>();
      const systemFieldId = preferences.systemFieldId ? parseInt(preferences.systemFieldId) : null;

      if (!systemFieldId) {
        return [
          {
            system: "System Field ID not configured",
            count: 1,
            percentage: 100,
          },
        ];
      }

      // Get tickets solved this week with custom fields
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const response = await zdFetch<{
        results: Array<{
          id: number;
          custom_fields: Array<{ id: number; value: string | null }>;
        }>;
      }>(
        `/api/v2/search.json?query=type:ticket assignee:me status:solved solved>${oneWeekAgo.toISOString().split("T")[0]}&include=custom_fields`,
      );

      const systemCounts: Record<string, number> = {};
      let totalTickets = 0;

      response.results.forEach((ticket) => {
        if (ticket.custom_fields) {
          const systemField = ticket.custom_fields.find((field) => field.id === systemFieldId);
          if (systemField && systemField.value) {
            const system = String(systemField.value);
            systemCounts[system] = (systemCounts[system] || 0) + 1;
            totalTickets++;
          }
        }
      });

      return Object.entries(systemCounts)
        .map(([system, count]) => ({
          system,
          count,
          percentage: Math.round((count / totalTickets) * 100),
        }))
        .sort((a, b) => b.count - a.count);
    } catch (e) {
      console.error("Failed to generate systems breakdown:", e);
      return [];
    }
  }

  function generateVerticalBarChart(data: DailyTicketData[]): string {
    if (data.length === 0) return "No data available";

    const maxValue = Math.max(...data.map((d) => Math.max(d.solved, d.submitted)));
    if (maxValue === 0) return "No activity in the last 5 days";

    const height = 6;
    let chart = "";

    // Build chart from top to bottom
    for (let row = height; row >= 1; row--) {
      let line = "";
      for (const day of data) {
        const solvedHeight = Math.ceil((day.solved / maxValue) * height);
        const submittedHeight = Math.ceil((day.submitted / maxValue) * height);

        if (row <= solvedHeight && row <= submittedHeight) {
          line += "██  "; // Both solved and submitted
        } else if (row <= solvedHeight) {
          line += "▓▓  "; // Only solved
        } else if (row <= submittedHeight) {
          line += "░░  "; // Only submitted
        } else {
          line += "    "; // Empty
        }
      }
      chart += line + "\n";
    }

    // Add date labels with better spacing
    chart +=
      data
        .map((d) => {
          const date = new Date(d.date);
          return date.toLocaleDateString("en-US", { weekday: "short" }).substring(0, 3);
        })
        .join("  ") + "\n";

    // Add numbers for each day
    chart += data.map((d) => `${d.solved.toString().padStart(2, " ")}s`).join(" ") + "\n";
    chart += data.map((d) => `${d.submitted.toString().padStart(2, " ")}n`).join(" ") + "\n";

    // Add legend
    chart += "\n▓▓ Solved  ░░ Submitted  ██ Both\ns = Solved count, n = New/Submitted count";

    return chart;
  }

  function generateSystemsChart(data: SystemData[]): string {
    if (data.length === 0) return "No systems data available";

    const maxCount = Math.max(...data.map((d) => d.count));

    return data
      .map((item) => {
        const barLength = Math.ceil((item.count / maxCount) * 20);
        const bar = "█".repeat(barLength);
        return `${item.system.padEnd(15)} ${bar} ${item.count} (${item.percentage}%)`;
      })
      .join("\n");
  }

  if (loading) {
    return <Detail isLoading={true} markdown="Loading dashboard..." />;
  }

  const markdown = `
# Zendesk Dashboard

${aiSuggestionsCount > 0 ? `🤖 **${aiSuggestionsCount} AI Macro Suggestions Available!** - [View Suggestions](raycast://extensions/zendesk-agent-toolkit/ai-suggestions)\n\n` : ""}

## 📋 Open Tickets Assigned to You (${openTickets.length})

${
  openTickets.length === 0
    ? "*No open tickets assigned to you*"
    : openTickets
        .map(
          (ticket) =>
            `**#${ticket.id}** - ${ticket.subject}\n*Updated: ${new Date(ticket.updated_at).toLocaleDateString()}*`,
        )
        .join("\n\n")
}

## 📊 5-Day Activity

\`\`\`
${generateVerticalBarChart(dailyData)}
\`\`\`

## 🔧 Systems Breakdown (This Week)

\`\`\`
${generateSystemsChart(systemsData)}
\`\`\`
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={loadDashboardData} />
          {aiSuggestionsCount > 0 && (
            <Action.Push
              title={`View ${aiSuggestionsCount} AI Macro Suggestions`}
              icon="🤖"
              target={<AISuggestions />}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
