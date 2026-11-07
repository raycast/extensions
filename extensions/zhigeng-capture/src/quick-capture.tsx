import {
  Action,
  ActionPanel,
  Form,
  LaunchProps,
  LocalStorage,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useCallback, useEffect, useRef, useState } from "react";
import { captureNote, NoteCaptureParams } from "./note-capture.js";
import { captureTodo, TodoCaptureParams } from "./todo-capture.js";

type CaptureType = "note" | "todo";
type StoredDate = string | null;
type NativeDate = Date | string | null | undefined;

interface DraftValues {
  captureType: CaptureType;
  title: string;
  project: string;
  body: string;
  eventDate: StoredDate;
  scheduledDate: StoredDate;
  dueDate: StoredDate;
  priority: string;
  captureId: string;
}

interface Receipt {
  captureId: string;
  type: CaptureType;
  taskId?: string;
  filePath?: string;
  savedAt: number;
}

const DRAFT_KEY = "zhigeng-quick-capture-draft";
const RECEIPT_KEY = "zhigeng-quick-capture-receipt";
const TYPE_OPTIONS = [
  { title: "Note", value: "note" },
  { title: "Todo", value: "todo" },
];
const PRIORITY_OPTIONS = [
  { title: "Normal", value: "normal" },
  { title: "High", value: "high" },
  { title: "Low", value: "low" },
];

function toDateString(value: NativeDate): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string")
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function parseDateString(value: StoredDate): Date | undefined {
  return value ? new Date(`${value}T00:00:00`) : undefined;
}
function defaultDraft(): DraftValues {
  return {
    captureType: "note",
    title: "",
    project: "",
    body: "",
    eventDate: null,
    scheduledDate: null,
    dueDate: null,
    priority: "normal",
    captureId: randomUUID(),
  };
}
type DraftInput = Omit<
  Partial<DraftValues>,
  "eventDate" | "scheduledDate" | "dueDate"
> & {
  eventDate?: NativeDate;
  scheduledDate?: NativeDate;
  dueDate?: NativeDate;
};
function normalizeDraft(input?: DraftInput): DraftValues {
  const merged = { ...defaultDraft(), ...input };
  return {
    ...merged,
    captureType: ["note", "todo"].includes(merged.captureType)
      ? merged.captureType
      : "note",
    eventDate: toDateString(input?.eventDate) ?? null,
    scheduledDate: toDateString(input?.scheduledDate) ?? null,
    dueDate: toDateString(input?.dueDate) ?? null,
    captureId: merged.captureId || randomUUID(),
  };
}

export default function QuickCapture(
  props: LaunchProps<{ draftValues?: DraftInput }>,
) {
  const [draft, setDraft] = useState<DraftValues>(() =>
    normalizeDraft(props.draftValues),
  );
  const [loaded, setLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const draftRef = useRef(draft);
  const receiptRef = useRef<Receipt | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageQueueRef = useRef(Promise.resolve());

  const enqueueStorage = useCallback((operation: () => Promise<void>) => {
    const next = storageQueueRef.current.then(operation, operation);
    storageQueueRef.current = next.catch(() => {});
    return next;
  }, []);
  const persistNow = useCallback(
    async (snapshot: DraftValues) => {
      draftRef.current = snapshot;
      await enqueueStorage(async () =>
        LocalStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot)),
      );
    },
    [enqueueStorage],
  );
  const schedulePersist = useCallback(
    (snapshot: DraftValues) => {
      draftRef.current = snapshot;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void persistNow(snapshot).catch(() => {});
      }, 300);
    },
    [persistNow],
  );
  const flushDraft = useCallback(
    async (snapshot: DraftValues) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      await persistNow(snapshot);
    },
    [persistNow],
  );

  useEffect(() => {
    void (async () => {
      try {
        const [storedDraft, storedReceipt] = await Promise.all([
          LocalStorage.getItem<string>(DRAFT_KEY),
          LocalStorage.getItem<string>(RECEIPT_KEY),
        ]);
        if (storedDraft) {
          const restored = normalizeDraft(JSON.parse(storedDraft));
          draftRef.current = restored;
          setDraft(restored);
        }
        if (storedReceipt)
          receiptRef.current = JSON.parse(storedReceipt) as Receipt;
      } catch {
        // Bad local state is ignored; the native draft remains usable.
      } finally {
        setLoaded(true);
      }
    })();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        if (receiptRef.current?.captureId !== draftRef.current.captureId) {
          void persistNow(draftRef.current).catch(() => {});
        }
      }
    };
  }, [persistNow]);

  const updateField = <K extends keyof DraftValues>(
    key: K,
    value: DraftValues[K],
  ) => {
    if (submittingRef.current) return;
    const next = { ...draftRef.current, [key]: value };
    if (receiptRef.current?.captureId === next.captureId) {
      next.captureId = randomUUID();
      receiptRef.current = null;
    }
    setDraft(next);
    schedulePersist(next);
  };

  async function finishSuccess(
    title: string,
    message: string,
    receipt: Receipt,
  ) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    receiptRef.current = receipt;
    // Serialized after all pending writes: an old debounce cannot recreate a cleared draft.
    await enqueueStorage(async () =>
      LocalStorage.setItem(RECEIPT_KEY, JSON.stringify(receipt)),
    );
    await enqueueStorage(async () => LocalStorage.removeItem(DRAFT_KEY));
    await showToast({ style: Toast.Style.Success, title, message });
    await popToRoot();
  }

  async function handleSubmit(values: {
    captureType: string;
    title: string;
    project: string;
    body: string;
    eventDate: NativeDate;
    scheduledDate: NativeDate;
    dueDate: NativeDate;
    priority: string;
  }) {
    if (submittingRef.current) return;
    const body = values.body || ""; // Preserve all user whitespace in the saved original.
    if (!body.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Body cannot be empty",
        message: "Please enter note or todo content",
      });
      return;
    }
    const type = values.captureType as CaptureType;
    const snapshot = normalizeDraft({
      ...draftRef.current,
      captureType: type,
      title: values.title || "",
      project: values.project || "",
      body,
      eventDate: values.eventDate ?? draftRef.current.eventDate,
      scheduledDate: values.scheduledDate,
      dueDate: values.dueDate,
      priority: values.priority || "normal",
    });
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await flushDraft(snapshot);
      const receipt = receiptRef.current;
      if (receipt?.captureId === snapshot.captureId) {
        await finishSuccess(
          "Saved",
          receipt.taskId
            ? `Task ${receipt.taskId}`
            : receipt.filePath || "Capture saved",
          receipt,
        );
        return;
      }
      if (snapshot.captureType === "note") {
        const result = await captureNote({
          type: "note",
          title: snapshot.title,
          project: snapshot.project,
          body: snapshot.body,
          legacyEventDate: snapshot.eventDate || undefined,
          captureId: snapshot.captureId,
        } as NoteCaptureParams);
        await finishSuccess("Note saved", result.filePath, {
          captureId: snapshot.captureId,
          type,
          filePath: result.filePath,
          savedAt: Date.now(),
        });
      } else {
        const result = await captureTodo({
          title: snapshot.title,
          project: snapshot.project,
          body: snapshot.body,
          scheduled: snapshot.scheduledDate || undefined,
          due: snapshot.dueDate || undefined,
          priority: snapshot.priority as TodoCaptureParams["priority"],
          captureId: snapshot.captureId,
        });
        await finishSuccess(
          "Todo draft saved",
          "Registration deferred to downstream workflow · " + result.filePath,
          {
            captureId: snapshot.captureId,
            type: "todo",
            filePath: result.filePath,
            savedAt: Date.now(),
          },
        );
      }
    } catch (error) {
      const accepted = receiptRef.current?.captureId === snapshot.captureId;
      await showToast({
        style: accepted ? Toast.Style.Success : Toast.Style.Failure,
        title: accepted ? "Content saved" : "Save failed",
        message: accepted
          ? `${receiptRef.current?.taskId || receiptRef.current?.filePath || ""} (submit again to dismiss)`
          : (error as Error).message || "Unknown error",
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (!loaded) return null;
  return (
    <Form
      enableDrafts
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="captureType"
        title="Type"
        value={draft.captureType}
        onChange={(value) => updateField("captureType", value as CaptureType)}
      >
        {TYPE_OPTIONS.map((item) => (
          <Form.Dropdown.Item key={item.value} {...item} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Optional title"
        value={draft.title}
        onChange={(value) => updateField("title", value)}
      />
      <Form.TextField
        id="project"
        title="Project"
        placeholder="Optional project name"
        value={draft.project}
        onChange={(value) => updateField("project", value)}
      />
      <Form.TextArea
        id="body"
        title="Body"
        autoFocus
        enableMarkdown={false}
        value={draft.body}
        onChange={(value) => updateField("body", value)}
        placeholder={
          draft.captureType === "todo"
            ? "Todo content (first line used as title if title is empty)"
            : "Note content (paste meeting notes, ideas, etc.)…"
        }
      />
      {draft.captureType === "todo" && (
        <>
          <Form.DatePicker
            id="scheduledDate"
            title="Scheduled"
            type={Form.DatePicker.Type.Date}
            value={parseDateString(draft.scheduledDate)}
            onChange={(value) =>
              updateField("scheduledDate", toDateString(value) ?? null)
            }
          />
          <Form.DatePicker
            id="dueDate"
            title="Due Date"
            type={Form.DatePicker.Type.Date}
            value={parseDateString(draft.dueDate)}
            onChange={(value) =>
              updateField("dueDate", toDateString(value) ?? null)
            }
          />
          <Form.Dropdown
            id="priority"
            title="Priority"
            value={draft.priority}
            onChange={(value) => updateField("priority", value)}
          >
            {PRIORITY_OPTIONS.map((item) => (
              <Form.Dropdown.Item key={item.value} {...item} />
            ))}
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}
