import React from "react";
import { Form } from "@raycast/api";

interface TextFieldProps {
  id: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function TextField({ id, title, value, onChange, placeholder = "" }: TextFieldProps) {
  return <Form.TextField id={id} title={title} placeholder={placeholder} value={value} onChange={onChange} />;
}

interface TextAreaProps {
  id: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  enableMarkdown?: boolean;
  required?: boolean;
}

export function TextArea({ id, title, value, onChange, placeholder = "", enableMarkdown = false }: TextAreaProps) {
  return (
    <Form.TextArea
      id={id}
      title={title}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      enableMarkdown={enableMarkdown}
    />
  );
}

interface CheckboxProps {
  id: string;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  title?: string;
}

export function Checkbox({ id, label, value, onChange, title }: CheckboxProps) {
  return <Form.Checkbox id={id} title={title} label={label} value={value} onChange={onChange} />;
}
