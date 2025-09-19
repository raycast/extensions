import React from "react";
import { Form } from "@raycast/api";

// Form Section with Header
interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <>
      <Form.Description title={title} text={description || ""} />
      {children}
    </>
  );
}

// Conditional Field Group (Checkbox + Conditional Field)
interface ConditionalFieldGroupProps {
  checkboxId: string;
  checkboxLabel: string;
  checkboxValue: boolean;
  onCheckboxChange: (value: boolean) => void;
  children: React.ReactNode;
  checkboxTitle?: string;
}

export function ConditionalFieldGroup({
  checkboxId,
  checkboxLabel,
  checkboxValue,
  onCheckboxChange,
  children,
  checkboxTitle,
}: ConditionalFieldGroupProps) {
  return (
    <>
      <Form.Checkbox
        id={checkboxId}
        title={checkboxTitle}
        label={checkboxLabel}
        value={checkboxValue}
        onChange={onCheckboxChange}
      />
      {checkboxValue && children}
    </>
  );
}

// Form Separator
export function FormSeparator() {
  return <Form.Separator />;
}

// Field Group Container
interface FieldGroupProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function FieldGroup({ children, title, description }: FieldGroupProps) {
  return (
    <>
      {(title || description) && <Form.Description title={title} text={description || ""} />}
      {children}
    </>
  );
}

// Status Indicator
interface StatusIndicatorProps {
  title: string;
  text: string;
  isLoading?: boolean;
}

export function StatusIndicator({ title, text, isLoading }: StatusIndicatorProps) {
  if (isLoading) {
    return <Form.Description title={title} text={`${text}...`} />;
  }
  return <Form.Description title={title} text={text} />;
}

// Form Layout Container
interface FormLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function FormLayout({ children, title, description }: FormLayoutProps) {
  return (
    <>
      {(title || description) && <Form.Description title={title} text={description || ""} />}
      {children}
    </>
  );
}
