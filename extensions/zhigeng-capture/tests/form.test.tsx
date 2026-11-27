import React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  store: new Map<string, string>(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  note: vi.fn(),
  todo: vi.fn(),
  toast: vi.fn(),
  pop: vi.fn(),
}));

vi.mock("@raycast/api", async () => {
  const { createElement } = await import("react");
  const control = (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as React.ReactNode);
  const Form = Object.assign(
    (props: Record<string, unknown>) =>
      createElement(
        "capture-form",
        props,
        props.children as React.ReactNode,
        props.actions as React.ReactNode,
      ),
    {
      Dropdown: Object.assign(control("dropdown"), { Item: control("item") }),
      TextField: control("textfield"),
      TextArea: control("textarea"),
      DatePicker: Object.assign(control("datepicker"), {
        Type: { Date: "date" },
      }),
    },
  );
  return {
    Form,
    Action: { SubmitForm: control("submit") },
    ActionPanel: control("actions"),
    LocalStorage: {
      getItem: fixture.getItem,
      setItem: fixture.setItem,
      removeItem: fixture.removeItem,
    },
    showToast: fixture.toast,
    popToRoot: fixture.pop,
    Toast: { Style: { Success: "success", Failure: "failure" } },
  };
});
vi.mock("../src/note-capture.js", () => ({ captureNote: fixture.note }));
vi.mock("../src/todo-capture.js", () => ({ captureTodo: fixture.todo }));

import QuickCapture from "../src/quick-capture.js";

const DRAFT = "zhigeng-quick-capture-draft";
const RECEIPT = "zhigeng-quick-capture-receipt";
const mounted: ReactTestRenderer[] = [];
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

async function mount(draftValues?: Record<string, unknown>) {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(React.createElement(QuickCapture, { draftValues } as never));
  });
  mounted.push(tree);
  return tree;
}
function field(tree: ReactTestRenderer, id: string) {
  return tree.root.findAll(
    (node) => typeof node.type === "string" && node.props.id === id,
  )[0];
}
function values(tree: ReactTestRenderer) {
  const result: Record<string, unknown> = {};
  for (const item of tree.root.findAll(
    (node) => typeof node.type === "string" && Boolean(node.props.id),
  )) {
    result[item.props.id] = item.props.value;
  }
  return result;
}
async function submit(tree: ReactTestRenderer) {
  await act(async () =>
    tree.root.findByType("submit").props.onSubmit(values(tree)),
  );
}

beforeEach(() => {
  fixture.store.clear();
  vi.clearAllMocks();
  fixture.getItem.mockImplementation(async (key: string) =>
    fixture.store.get(key),
  );
  fixture.setItem.mockImplementation(async (key: string, value: string) => {
    fixture.store.set(key, value);
  });
  fixture.removeItem.mockImplementation(async (key: string) => {
    fixture.store.delete(key);
  });
  fixture.note.mockResolvedValue({
    success: true,
    filePath: "/tmp/offline-note.md",
  });
  fixture.todo.mockResolvedValue({
    success: true,
    filePath: "/tmp/offline-todo.md",
  });
  fixture.toast.mockResolvedValue(undefined);
  fixture.pop.mockResolvedValue(undefined);
});
afterEach(async () => {
  await act(async () => {
    for (const tree of mounted.splice(0)) tree.unmount();
  });
});

describe("capture form behavior with an isolated Raycast adapter", () => {
  it("restores native dates and permits changing the restored capture type", async () => {
    const tree = await mount({
      captureType: "todo",
      body: "task",
      scheduledDate: new Date(2026, 10, 7),
      captureId: "native",
    });
    expect(field(tree, "captureType").props.value).toBe("todo");
    expect(field(tree, "scheduledDate").props.value.getDate()).toBe(7);
    await act(async () => field(tree, "captureType").props.onChange("note"));
    expect(field(tree, "captureType").props.value).toBe("note");
    expect(field(tree, "eventDate")).toBeUndefined();
    expect(tree.root.findAllByType("item").map((item) => item.props.value)).toEqual(["note", "todo"]);
  });

  it("migrates an old meeting draft into a note without dropping its date or body", async () => {
    const tree = await mount({ captureType: "meeting", eventDate: "2026-11-07", body: "old meeting", captureId: "legacy" });
    expect(field(tree, "captureType").props.value).toBe("note");
    await submit(tree);
    expect(fixture.note).toHaveBeenCalledWith(expect.objectContaining({ type: "note", body: "old meeting", legacyEventDate: "2026-11-07" }));
  });

  it("saves the full TODO with explicit dates as a raw draft and shows deferred registration", async () => {
    const tree = await mount({ captureType: "todo", body: "title\ndetails", scheduledDate: "2026-11-07", dueDate: "2026-11-09", priority: "high" });
    await submit(tree);
    expect(fixture.todo).toHaveBeenCalledWith(expect.objectContaining({ body: "title\ndetails", scheduled: "2026-11-07", due: "2026-11-09", priority: "high" }));
    expect(fixture.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Todo draft saved" }));
  });

  it("keeps the latest input when exiting before the debounce runs", async () => {
    const tree = await mount();
    const original = "  meeting line\n\nlast line  ";
    await act(async () => field(tree, "body").props.onChange(original));
    await act(async () => tree.unmount());
    mounted.splice(mounted.indexOf(tree), 1);
    expect(JSON.parse(fixture.store.get(DRAFT)!).body).toBe(original);
  });

  it("preserves all original whitespace and restores a failed submission", async () => {
    fixture.note.mockRejectedValue(new Error("offline write failure"));
    const original = "  first line\n\nlast line  \n";
    const tree = await mount();
    await act(async () => field(tree, "body").props.onChange(original));
    await submit(tree);
    expect(fixture.note.mock.calls[0][0].body).toBe(original);
    expect(JSON.parse(fixture.store.get(DRAFT)!).body).toBe(original);
    expect(fixture.pop).not.toHaveBeenCalled();
    const restored = await mount();
    expect(field(restored, "body").props.value).toBe(original);
  });

  it("uses a persisted successful receipt instead of saving the same capture again", async () => {
    fixture.store.set(
      DRAFT,
      JSON.stringify({
        captureId: "saved",
        captureType: "note",
        title: "",
        project: "",
        body: "already saved",
      }),
    );
    fixture.store.set(
      RECEIPT,
      JSON.stringify({
        captureId: "saved",
        type: "note",
        filePath: "/tmp/saved.md",
        savedAt: 1,
      }),
    );
    const tree = await mount();
    await submit(tree);
    expect(fixture.note).not.toHaveBeenCalled();
    expect(fixture.store.has(DRAFT)).toBe(false);
    expect(fixture.pop).toHaveBeenCalledOnce();
  });

  it("does not duplicate a successful write if receipt persistence fails once", async () => {
    let fail = true;
    fixture.setItem.mockImplementation(async (key: string, value: string) => {
      if (key === RECEIPT && fail) {
        fail = false;
        throw new Error("offline storage failure");
      }
      fixture.store.set(key, value);
    });
    const tree = await mount({ body: "write once", captureId: "once" });
    await submit(tree);
    await submit(tree);
    expect(fixture.note).toHaveBeenCalledOnce();
    expect(fixture.store.has(DRAFT)).toBe(false);
  });

  it("guards rapid duplicate submissions while the draft flush is pending", async () => {
    const tree = await mount({ body: "single capture", captureId: "double" });
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    fixture.setItem.mockImplementationOnce(
      async (key: string, value: string) => {
        await blocked;
        fixture.store.set(key, value);
      },
    );
    const handler = tree.root.findByType("submit").props.onSubmit;
    const submitted = values(tree);
    await act(async () => {
      const first = handler(submitted);
      const second = handler(submitted);
      await Promise.resolve();
      release();
      await Promise.all([first, second]);
    });
    expect(fixture.note).toHaveBeenCalledOnce();
  });

  it("treats edited input after a successful save as a new capture", async () => {
    fixture.pop.mockRejectedValueOnce(new Error("offline window failure"));
    const tree = await mount({ body: "first note", captureId: "first" });
    await submit(tree);
    await act(async () => field(tree, "body").props.onChange("second note"));
    await submit(tree);
    expect(fixture.note).toHaveBeenCalledTimes(2);
    expect(fixture.note.mock.calls[1][0].body).toBe("second note");
    expect(fixture.note.mock.calls[1][0].captureId).not.toBe("first");
  });

  it("clears a successful draft without a late write restoring old contents", async () => {
    const tree = await mount();
    await act(async () => field(tree, "body").props.onChange("saved note"));
    await submit(tree);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
    expect(fixture.store.has(DRAFT)).toBe(false);
    expect(fixture.store.has(RECEIPT)).toBe(true);
  });
});
