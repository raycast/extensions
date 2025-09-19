import { getPreferenceValues } from "@raycast/api";
import { zdFetch, getCurrentUserId } from "./zendesk";
import { aiService, TicketAnalysis, MacroSuggestion } from "./ai-service";

interface MonitorPreferences {
  enableAIMacros?: boolean;
}

interface TicketEvent {
  id: number;
  subject: string;
  status: string;
  priority?: string;
  created_at: string;
  updated_at: string;
  assignee_id?: number;
  requester_id: number;
  description?: string;
  custom_fields?: Array<{ id: number; value: string | number | null }>;
  tags?: string[];
}

interface TicketComment {
  id: number;
  body: string;
  public: boolean;
  author_id: number;
  created_at: string;
}

interface TicketHistory {
  events: Array<{
    id: number;
    field_name: string;
    previous_value: string | number | boolean | null;
    value: string | number | boolean | null;
    created_at: string;
  }>;
}

class TicketMonitor {
  private recentlyAnalyzed = new Set<number>();
  private lastCheckTime = new Date();

  constructor() {
    // Clear the recently analyzed cache every hour
    setInterval(
      () => {
        this.recentlyAnalyzed.clear();
      },
      60 * 60 * 1000,
    );
  }

  public async checkForResolvedTickets(): Promise<MacroSuggestion[]> {
    if (!this.isMonitoringEnabled()) {
      return [];
    }

    try {
      const currentUserId = await getCurrentUserId();
      const recentlyResolved = await this.getRecentlyResolvedTickets(currentUserId);

      const suggestions: MacroSuggestion[] = [];

      for (const ticket of recentlyResolved) {
        if (this.recentlyAnalyzed.has(ticket.id)) {
          continue; // Skip if we've already analyzed this ticket
        }

        const analysis = await this.analyzeResolvedTicket(ticket);
        if (analysis) {
          suggestions.push(analysis);
        }

        this.recentlyAnalyzed.add(ticket.id);
      }

      return suggestions;
    } catch (error) {
      console.error("Error checking for resolved tickets:", error);
      return [];
    }
  }

  private isMonitoringEnabled(): boolean {
    try {
      const preferences = getPreferenceValues<MonitorPreferences>();
      return Boolean(preferences.enableAIMacros && aiService.isEnabled());
    } catch {
      return false;
    }
  }

  private async getRecentlyResolvedTickets(userId: number): Promise<TicketEvent[]> {
    // Get tickets solved in the last 24 hours by the current user
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const searchQuery = `type:ticket assignee:${userId} status:solved solved>${twentyFourHoursAgo.split("T")[0]}`;

    const response = await zdFetch<{ results: TicketEvent[] }>(
      `/api/v2/search.json?query=${encodeURIComponent(searchQuery)}&sort_by=updated_at&sort_order=desc`,
    );

    return response.results.filter((ticket) => new Date(ticket.updated_at) > this.lastCheckTime);
  }

  private async analyzeResolvedTicket(ticket: TicketEvent): Promise<MacroSuggestion | null> {
    try {
      // Get full ticket details including comments and history
      const [ticketDetails, comments, history] = await Promise.all([
        this.getFullTicketDetails(ticket.id),
        this.getTicketComments(ticket.id),
        this.getTicketHistory(ticket.id),
      ]);

      // Find the resolution comment (last public comment by an agent)
      const resolutionComment = this.findResolutionComment(comments, await getCurrentUserId());

      // Extract the sequence of actions taken to resolve the ticket
      const assigneeActions = this.extractAssigneeActions(history);

      // Build the ticket analysis object
      const ticketAnalysis: TicketAnalysis = {
        id: ticket.id,
        subject: ticket.subject,
        description: ticketDetails.description || "",
        status: ticket.status,
        priority: ticket.priority,
        resolution_comment: resolutionComment?.body,
        tags: ticket.tags,
        custom_fields: ticket.custom_fields,
        created_at: ticket.created_at,
        solved_at: ticket.updated_at,
        assignee_actions: assigneeActions,
      };

      // Find similar tickets for pattern recognition
      const recentTickets = await this.getRecentSimilarTickets(ticketAnalysis);
      const similarTickets = await aiService.findSimilarTickets(ticketAnalysis, recentTickets);

      // Get AI analysis
      const suggestion = await aiService.analyzeTicketForMacro(ticketAnalysis, similarTickets);

      if (suggestion) {
        suggestion.similar_tickets = similarTickets.map((t) => t.id);
      }

      return suggestion;
    } catch (error) {
      console.error(`Failed to analyze ticket ${ticket.id}:`, error);
      return null;
    }
  }

  private async getFullTicketDetails(ticketId: number): Promise<TicketEvent> {
    const response = await zdFetch<{ ticket: TicketEvent }>(`/api/v2/tickets/${ticketId}.json`);
    return response.ticket;
  }

  private async getTicketComments(ticketId: number): Promise<TicketComment[]> {
    const response = await zdFetch<{ comments: TicketComment[] }>(`/api/v2/tickets/${ticketId}/comments.json`);
    return response.comments;
  }

  private async getTicketHistory(ticketId: number): Promise<TicketHistory> {
    try {
      return await zdFetch<TicketHistory>(`/api/v2/tickets/${ticketId}/audits.json`);
    } catch {
      // If history is not available, return empty
      return { events: [] };
    }
  }

  private findResolutionComment(comments: TicketComment[], agentId: number): TicketComment | null {
    // Find the last public comment made by the resolving agent
    const agentComments = comments
      .filter((comment) => comment.author_id === agentId && comment.public)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return agentComments[0] || null;
  }

  private extractAssigneeActions(history: TicketHistory): Array<{
    field: string;
    from_value: string | number | boolean | null;
    to_value: string | number | boolean | null;
    timestamp: string;
  }> {
    // Extract actions that the agent took to resolve the ticket
    const relevantFields = ["status", "priority", "assignee_id", "comment"];

    return history.events
      .filter((event) => relevantFields.includes(event.field_name))
      .map((event) => ({
        field: event.field_name,
        from_value: event.previous_value,
        to_value: event.value,
        timestamp: event.created_at,
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private async getRecentSimilarTickets(ticket: TicketAnalysis): Promise<TicketAnalysis[]> {
    try {
      // Get tickets resolved in the last 30 days for pattern matching
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const userId = await getCurrentUserId();

      const searchQuery = `type:ticket assignee:${userId} status:solved solved>${thirtyDaysAgo}`;

      const response = await zdFetch<{ results: TicketEvent[] }>(
        `/api/v2/search.json?query=${encodeURIComponent(searchQuery)}&per_page=50`,
      );

      return response.results
        .filter((t) => t.id !== ticket.id)
        .map((t) => ({
          id: t.id,
          subject: t.subject,
          description: t.description || "",
          status: t.status,
          priority: t.priority,
          tags: t.tags,
          custom_fields: t.custom_fields,
          created_at: t.created_at,
          solved_at: t.updated_at,
          assignee_actions: [], // Simplified for similarity matching
        }));
    } catch {
      return [];
    }
  }

  public updateLastCheckTime(): void {
    this.lastCheckTime = new Date();
  }
}

export const ticketMonitor = new TicketMonitor();
export type { TicketEvent };
