export type CommandName = "zo-setup" | "zo-chat" | "zo-models" | "zo-activity";

export type RiskLevel = "safe" | "destructive";

export type ExecutionTarget = "zo-api";

export type ToolExecutionRecord = {
  id: string;
  toolName: string;
  target: ExecutionTarget;
  riskLevel: RiskLevel;
  timestampIso: string;
  parameters: Record<string, unknown>;
  outcome: "success" | "failed" | "canceled";
  errorMessage?: string;
};

export type ZoModel = {
  id: string;
  label: string;
  description?: string;
  isDefault?: boolean;
};

export type ZoMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  thinking?: string;
};

export type ZoChatRequest = {
  model: string;
  messages: ZoMessage[];
  stream?: boolean;
  temperature?: number;
  conversationId?: string;
};

export type ZoStructuredAskOutput = {
  answer: string;
  thinking: string;
};

export type ZoChatResponse = {
  id?: string;
  model?: string;
  conversationId?: string;
  outputText: string;
  thinkingText?: string;
  raw: unknown;
};

export type ZoChatStreamDeltaKind = "answer" | "thinking";

export type DiagnosticStatus = "ok" | "warn" | "error" | "pending";

export type DiagnosticItem = {
  id: string;
  label: string;
  status: DiagnosticStatus;
  detail: string;
};
