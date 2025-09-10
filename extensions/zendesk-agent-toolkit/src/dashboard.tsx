import { Action, ActionPanel, Detail, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { zdFetch, getCurrentUserId } from "./zendesk";

interface TicketStats {
  solved: number;
  pending: number;
  open: number;
  total: number;
  thisWeek: number;
  thisMonth: number;
  avgResolutionTime?: string;
}

interface TimeSeriesData {
  date: string;
  count: number;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<TimeSeriesData[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      await getCurrentUserId(); // Verify auth

      // Get current stats
      const [solvedResponse, pendingResponse, openResponse] = await Promise.all([
        zdFetch<{ results: Array<{ id: number; subject: string; updated_at: string }> }>(
          `/api/v2/search.json?query=type:ticket assignee:me status:solved`,
        ),
        zdFetch<{ results: Array<{ id: number; subject: string; updated_at: string }> }>(
          `/api/v2/search.json?query=type:ticket assignee:me status:pending`,
        ),
        zdFetch<{ results: Array<{ id: number; subject: string; updated_at: string }> }>(
          `/api/v2/search.json?query=type:ticket assignee:me status:open`,
        ),
      ]);

      // Get this week's solved tickets
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeekResponse = await zdFetch<{ results: Array<{ id: number; subject: string; updated_at: string }> }>(
        `/api/v2/search.json?query=type:ticket assignee:me status:solved solved>${oneWeekAgo.toISOString().split("T")[0]}`,
      );

      // Get this month's solved tickets
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const thisMonthResponse = await zdFetch<{ results: Array<{ id: number; subject: string; updated_at: string }> }>(
        `/api/v2/search.json?query=type:ticket assignee:me status:solved solved>${oneMonthAgo.toISOString().split("T")[0]}`,
      );

      // Generate weekly data for the last 8 weeks
      const weeklyStats = await generateWeeklyStats();

      setStats({
        solved: solvedResponse.results.length,
        pending: pendingResponse.results.length,
        open: openResponse.results.length,
        total: solvedResponse.results.length + pendingResponse.results.length + openResponse.results.length,
        thisWeek: thisWeekResponse.results.length,
        thisMonth: thisMonthResponse.results.length,
      });

      setWeeklyData(weeklyStats);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load dashboard",
        message: String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  async function generateWeeklyStats(): Promise<TimeSeriesData[]> {
    const weeks: TimeSeriesData[] = [];

    for (let i = 7; i >= 0; i--) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (i * 7 + 7));
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - i * 7);

      try {
        const response = await zdFetch<{ results: Array<{ id: number; subject: string; updated_at: string }> }>(
          `/api/v2/search.json?query=type:ticket assignee:me status:solved solved>${startDate.toISOString().split("T")[0]} solved<${endDate.toISOString().split("T")[0]}`,
        );

        weeks.push({
          date: startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          count: response.results.length,
        });
      } catch (e) {
        console.error(`Failed to get stats for week ${i}:`, e);
        weeks.push({
          date: startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          count: 0,
        });
      }
    }

    return weeks;
  }

  function generateSparkline(data: TimeSeriesData[]): string {
    if (data.length === 0) return "";

    const max = Math.max(...data.map((d) => d.count));
    if (max === 0) return "▁".repeat(data.length);

    const bars = "▁▂▃▄▅▆▇█";
    return data
      .map((d) => {
        const normalized = Math.floor((d.count / max) * (bars.length - 1));
        return bars[normalized];
      })
      .join("");
  }

  if (loading || !stats) {
    return <Detail isLoading={true} />;
  }

  const markdown = `
# 📊 Your Zendesk Performance Dashboard

## 🎯 Current Status
- **Solved Tickets**: ${stats.solved}
- **Open Tickets**: ${stats.open}
- **Pending Tickets**: ${stats.pending}
- **Total Assigned**: ${stats.total}

## 📈 Recent Performance
- **This Week**: ${stats.thisWeek} tickets solved
- **This Month**: ${stats.thisMonth} tickets solved
- **Weekly Average**: ${Math.round(stats.thisMonth / 4)} tickets

## 📊 8-Week Trend
\`\`\`
${generateSparkline(weeklyData)}
${weeklyData.map((d) => d.date.slice(0, 3)).join(" ")}
${weeklyData.map((d) => d.count.toString().padStart(3)).join(" ")}
\`\`\`

## 🏆 Performance Metrics
- **Resolution Rate**: ${stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0}%
- **Productivity Score**: ${stats.thisWeek >= 10 ? "🔥 High" : stats.thisWeek >= 5 ? "📈 Good" : "📊 Normal"}

---

💡 **Tip**: Keep your open tickets low and maintain a steady resolution pace for optimal performance!
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh Data" onAction={loadDashboardData} />
          <Action.Push title="View Tickets" target={<DashboardTicketList />} />
        </ActionPanel>
      }
    />
  );
}

interface Ticket {
  id: number;
  subject: string;
  updated_at: string;
}

function DashboardTicketList() {
  const [loading, setLoading] = useState(true);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    loadRecentTickets();
  }, []);

  async function loadRecentTickets() {
    setLoading(true);
    try {
      // Get last 10 solved tickets
      const response = await zdFetch<{ results: Ticket[] }>(
        `/api/v2/search.json?query=type:ticket assignee:me status:solved sort:updated_at`,
      );

      setRecentTickets(response.results.slice(0, 10));
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load recent tickets",
        message: String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <List isLoading={loading} navigationTitle="Recently Solved Tickets">
      {recentTickets.map((ticket) => (
        <List.Item
          key={ticket.id}
          title={ticket.subject || `Ticket #${ticket.id}`}
          subtitle={`Solved • Updated ${new Date(ticket.updated_at).toLocaleDateString()}`}
          accessories={[{ tag: { value: "Solved", color: "#00C853" } }, { date: new Date(ticket.updated_at) }]}
        />
      ))}
    </List>
  );
}
