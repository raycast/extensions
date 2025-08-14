import { Action, ActionPanel, Form, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { zdFetch, getAgentTicketUrl, getCurrentUserId } from "./zendesk";

interface Ticket {
  id: number;
  subject: string;
  status: string;
  updated_at: string;
}
interface SearchResponse {
  results: Array<Ticket & { result_type: string }>;
}

export default function Tickets() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [query, setQuery] = useState("type:ticket assignee:me status<solved");

  async function load(q: string) {
    setLoading(true);
    try {
      const data = await zdFetch<SearchResponse>(
        `/api/v2/search.json?query=${encodeURIComponent(q)}&sort_by=updated_at&sort_order=desc`,
      );
      setTickets(data.results.filter((r) => r.result_type === "ticket"));
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to load tickets", message: String(e) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(query);
  }, [query]);

  return (
    <List isLoading={loading} searchBarPlaceholder="Search Zendesk…" onSearchTextChange={setQuery} throttle>
      {tickets.map((t: Ticket) => (
        <List.Item
          key={t.id}
          title={t.subject || `Ticket #${t.id}`}
          accessories={[{ tag: t.status }, { date: new Date(t.updated_at) }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={getAgentTicketUrl(t.id)} />
              <Action.Push title="Reply…" target={<ReplyForm ticketId={t.id} />} />
              <Action title="Assign to Me" onAction={() => assignToMe(t.id)} />
              <Action title="Mark as Solved" onAction={() => updateStatus(t.id, "solved")} />
              <Action title="Mark as Pending" onAction={() => updateStatus(t.id, "pending")} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ReplyForm({ ticketId }: { ticketId: number }) {
  const [text, setText] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  async function submit() {
    if (!text.trim()) return;
    await showToast({ style: Toast.Style.Animated, title: "Sending reply…" });
    try {
      await zdFetch(`/api/v2/tickets/${ticketId}.json`, {
        method: "PUT",
        body: JSON.stringify({ ticket: { comment: { body: text, public: isPublic } } }),
      });
      await showToast({ style: Toast.Style.Success, title: "Reply sent" });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to send reply", message: String(e) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Reply" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title={`Reply to #${ticketId}`} text="" />
      <Form.Checkbox id="public" label="Public Reply" value={isPublic} onChange={setIsPublic} />
      <Form.TextArea
        id="body"
        title="Message"
        value={text}
        onChange={setText}
        enableMarkdown
        placeholder="Type your reply…"
      />
    </Form>
  );
}

async function assignToMe(ticketId: number) {
  try {
    const me = await getCurrentUserId();
    await zdFetch(`/api/v2/tickets/${ticketId}.json`, {
      method: "PUT",
      body: JSON.stringify({ ticket: { assignee_id: me } }),
    });
    await showToast({ style: Toast.Style.Success, title: "Assigned to you" });
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to assign", message: String(e) });
  }
}

async function updateStatus(ticketId: number, status: "pending" | "solved" | "open" | "hold") {
  try {
    await zdFetch(`/api/v2/tickets/${ticketId}.json`, {
      method: "PUT",
      body: JSON.stringify({ ticket: { status } }),
    });
    await showToast({ style: Toast.Style.Success, title: `Marked ${status}` });
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to update status", message: String(e) });
  }
}
