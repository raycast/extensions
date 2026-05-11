import { Color, Icon } from "@raycast/api";

export interface Preferences {
  connectionType: "local" | "cloud";
  namespace: string;
  apiKey?: string;
  temporalUiUrl: string;
}

export type WorkflowStatus =
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "TERMINATED"
  | "TIMED_OUT"
  | "CONTINUED_AS_NEW"
  | "UNKNOWN";

export interface WorkflowInfo {
  workflowId: string;
  runId: string;
  type: string;
  status: WorkflowStatus;
  startTime: Date;
  closeTime?: Date;
  taskQueue: string;
  historyLength?: number;
  memo?: Record<string, unknown>;
  searchAttributes?: Record<string, unknown>;
  parentWorkflowId?: string;
  parentRunId?: string;
}

export interface NamespaceInfo {
  name: string;
  state: string;
  description?: string;
}

export interface ScheduleInfo {
  scheduleId: string;
  memo?: Record<string, unknown>;
  isPaused: boolean;
  numActions: number;
  numActionsSkipped: number;
  nextActionTimes: Date[];
  recentActions: ScheduleAction[];
  workflowType?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ScheduleAction {
  scheduledAt: Date;
  startedAt: Date;
  workflowId?: string;
  runId?: string;
}

export interface HistoryEvent {
  eventId: number;
  eventTime: Date;
  eventType: string;
  details?: Record<string, unknown>;
}

export interface WorkflowStatusConfig {
  icon: Icon;
  color: Color;
  label: string;
}

export const WORKFLOW_STATUS_CONFIG: Record<WorkflowStatus, WorkflowStatusConfig> = {
  RUNNING: {
    icon: Icon.CircleProgress,
    color: Color.Blue,
    label: "Running",
  },
  COMPLETED: {
    icon: Icon.CheckCircle,
    color: Color.Green,
    label: "Completed",
  },
  FAILED: {
    icon: Icon.XMarkCircle,
    color: Color.Red,
    label: "Failed",
  },
  CANCELLED: {
    icon: Icon.MinusCircle,
    color: Color.Orange,
    label: "Cancelled",
  },
  TERMINATED: {
    icon: Icon.Stop,
    color: Color.Red,
    label: "Terminated",
  },
  TIMED_OUT: {
    icon: Icon.Clock,
    color: Color.Yellow,
    label: "Timed Out",
  },
  CONTINUED_AS_NEW: {
    icon: Icon.ArrowRight,
    color: Color.Purple,
    label: "Continued As New",
  },
  UNKNOWN: {
    icon: Icon.QuestionMark,
    color: Color.SecondaryText,
    label: "Unknown",
  },
};
