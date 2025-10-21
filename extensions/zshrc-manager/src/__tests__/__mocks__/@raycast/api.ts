/**
 * Mock for @raycast/api for testing purposes
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import { vi } from "vitest";

// Mock Icon enum
export const Icon = {
  // Generic icons
  Folder: "folder" as const,
  Document: "document" as const,
  Terminal: "terminal" as const,
  Code: "code" as const,
  Box: "box" as const,
  Database: "database" as const,
  Gear: "gear" as const,
  Eye: "eye" as const,
  Check: "check" as const,
  CheckCircle: "check-circle" as const,
  Text: "text" as const,
  Clock: "clock" as const,
  Keyboard: "keyboard" as const,
  Shield: "shield" as const,
  Globe: "globe" as const,
  BarChart: "bar-chart" as const,
  Plus: "plus" as const,
  ArrowClockwise: "arrow-clockwise" as const,
  Pencil: "pencil" as const,
  Trash: "trash" as const,
};

// Mock ActionPanel component
export const ActionPanel = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(
    "div",
    { "data-testid": "action-panel" },
    children,
  );
};

// Mock Action components
const ActionObject = {
  Style: {
    Destructive: "destructive" as const,
    Regular: "regular" as const,
  },
  Push: ({ children, ...props }: any) => {
    return React.createElement(
      "div",
      { "data-testid": "action-push", ...props },
      children,
    );
  },
  Open: ({ children, ...props }: any) => {
    return React.createElement(
      "div",
      { "data-testid": "action-open", ...props },
      children,
    );
  },
  SubmitForm: ({ children, title, onSubmit, ...props }: any) => {
    return React.createElement(
      "button",
      {
        "data-testid": "action-submit-form",
        onClick: onSubmit,
        ...props,
      },
      title || children,
    );
  },
  CopyToClipboard: ({ children, ...props }: any) => {
    return React.createElement(
      "div",
      { "data-testid": "action-copy", ...props },
      children,
    );
  },
  OpenWith: ({ children, ...props }: any) => {
    return React.createElement(
      "div",
      { "data-testid": "action-open-with", ...props },
      children,
    );
  },
};

// Export Action as both a component and an object with sub-components
export const Action = Object.assign(
  ({ children, style, title, onAction, ...props }: any) => {
    // Handle Raycast Action.Style values
    const buttonProps: any = { "data-testid": "action-component", ...props };
    if (style === "destructive") {
      buttonProps.style = { backgroundColor: "red" };
    }
    // Map onAction to onClick for testing
    if (onAction) {
      buttonProps.onClick = onAction;
    }
    // Use title as children if provided, otherwise use children
    const buttonContent = title || children;
    return React.createElement("button", buttonProps, buttonContent);
  },
  ActionObject,
);

// Mock Form component - this needs to be a React component that renders children
export const Form = ({ children, actions, ...props }: any) => {
  const allChildren = [];
  if (actions)
    allChildren.push(React.cloneElement(actions, { key: "actions" }));
  if (children) {
    if (Array.isArray(children)) {
      allChildren.push(
        ...children.map((child, index) =>
          React.isValidElement(child)
            ? React.cloneElement(child, { key: `child-${index}` })
            : child,
        ),
      );
    } else {
      allChildren.push(
        React.isValidElement(children)
          ? React.cloneElement(children, { key: "child" })
          : children,
      );
    }
  }

  // Mock requestSubmit to prevent warnings
  const formProps = {
    "data-testid": "form",
    requestSubmit: () => {}, // Mock implementation
    ...props,
  };

  return React.createElement("form", formProps, allChildren);
};

// Mock Form sub-components
Form.TextField = ({ children, value, onChange, ...props }: any) => {
  return React.createElement(
    "input",
    {
      "data-testid": "form-text-field",
      value: value || "",
      onChange: (e: any) => onChange && onChange(e.target.value),
      ...props,
    },
    children,
  );
};

Form.Dropdown = ({ children, ...props }: any) => {
  return React.createElement(
    "select",
    { "data-testid": "form-dropdown", ...props },
    children,
  );
};

Form.TextArea = ({ children, ...props }: any) => {
  return React.createElement(
    "textarea",
    { "data-testid": "form-textarea", ...props },
    children,
  );
};

Form.Description = ({ children, text, ...props }: any) => {
  return React.createElement(
    "div",
    { "data-testid": "form-description", ...props },
    text || children,
  );
};

// Mock List components
export const List = (props: any) => {
  const content = [];
  // Render navigationTitle as visible text for testing
  if (props.navigationTitle) {
    content.push(
      React.createElement(
        "div",
        { key: "navigation-title" },
        props.navigationTitle,
      ),
    );
  }
  if (props.children) {
    content.push(props.children);
  }

  return React.createElement(
    "div",
    { "data-testid": "list", className: props.className },
    content,
  );
};

List.Item = ({
  children,
  title,
  subtitle,
  accessories,
  detail,
  ...props
}: any) => {
  const content = [];
  if (title) content.push(React.createElement("div", { key: "title" }, title));
  if (subtitle)
    content.push(React.createElement("div", { key: "subtitle" }, subtitle));
  if (accessories) {
    // Handle accessories array - each accessory can be {text} or {icon}
    const accessoryContent = accessories
      .map((accessory: any, index: number) => {
        if (accessory.text) {
          return React.createElement(
            "div",
            { key: `accessory-text-${index}` },
            accessory.text,
          );
        }
        if (accessory.icon) {
          return React.createElement(
            "div",
            { key: `accessory-icon-${index}` },
            "icon",
          );
        }
        return null;
      })
      .filter(Boolean);
    content.push(
      React.createElement("div", { key: "accessories" }, accessoryContent),
    );
  }
  if (detail)
    content.push(React.createElement("div", { key: "detail" }, detail));
  if (children) content.push(children);

  return React.createElement(
    "div",
    { "data-testid": "list-item", ...props },
    content,
  );
};

const ListItemDetail = ({ children, markdown, metadata, ...props }: any) => {
  return React.createElement(
    "div",
    { "data-testid": "list-item-detail", ...props },
    [
      markdown && React.createElement("div", { key: "markdown" }, markdown),
      metadata && React.createElement("div", { key: "metadata" }, metadata),
      children,
    ],
  );
};

// Add Detail property to List.Item
(List.Item as any).Detail = ListItemDetail;

(ListItemDetail as any).Metadata = ({ children, ...props }: any) => {
  return React.createElement(
    "div",
    { "data-testid": "list-item-detail-metadata", ...props },
    children,
  );
};

(ListItemDetail as any).Metadata.Label = ({
  children,
  title,
  text,
  ...props
}: any) => {
  const content = [];
  if (title) content.push(React.createElement("div", { key: "title" }, title));
  if (text) {
    const textValue = typeof text === "string" ? text : text.value;
    content.push(React.createElement("div", { key: "text" }, textValue));
  }
  if (children) content.push(children);
  return React.createElement(
    "div",
    { "data-testid": "list-item-detail-metadata-label", ...props },
    content,
  );
};

(ListItemDetail as any).Metadata.TagList = ({ children, ...props }: any) => {
  return React.createElement(
    "div",
    { "data-testid": "list-item-detail-metadata-taglist", ...props },
    children,
  );
};

(ListItemDetail as any).Metadata.TagList.Item = ({
  children,
  ...props
}: any) => {
  return React.createElement(
    "div",
    { "data-testid": "list-item-detail-metadata-taglist-item", ...props },
    children,
  );
};

List.Section = ({ children, title, ...props }: any) => {
  return React.createElement(
    "div",
    { "data-testid": "list-section", ...props },
    [title && React.createElement("div", { key: "title" }, title), children],
  );
};

// Mock other components
export const Color = {
  Red: "red" as const,
  Green: "green" as const,
  Blue: "blue" as const,
  Yellow: "yellow" as const,
  Orange: "orange" as const,
  Purple: "purple" as const,
  Pink: "pink" as const,
  Gray: "gray" as const,
  Black: "black" as const,
  White: "white" as const,
};

// Mock Detail component
export const Detail = ({ children, markdown, ...props }: any) => {
  // Convert markdown to HTML-like text for testing
  const content = markdown || children || "Detail content";
  const textContent =
    typeof content === "string"
      ? content
          .replace(/#+\s*/g, "")
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/`(.*?)`/g, "$1")
          .replace(/---/g, "")
          .trim()
      : content;

  return React.createElement(
    "div",
    { "data-testid": "detail", ...props },
    textContent,
  );
};

// Mock functions
export const showToast = vi.fn().mockResolvedValue(undefined);
export const popToRoot = vi.fn().mockResolvedValue(undefined);

export const Toast = {
  Style: {
    Failure: "failure" as const,
    Success: "success" as const,
  },
};
