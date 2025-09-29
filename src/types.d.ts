declare module "@raycast/api" {
  import { ReactElement, ReactNode } from "react";

  export interface FormProps {
    actions?: ReactNode;
    children?: ReactNode;
  }

  export interface ActionPanelProps {
    children?: ReactNode;
  }

  export interface ActionProps {
    title: string;
    onAction?: () => void;
    shortcut?: { modifiers: string[]; key: string };
  }

  export interface TextAreaProps {
    id: string;
    title: string;
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
    error?: string;
  }

  export interface TextFieldProps {
    id: string;
    title: string;
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
    info?: string;
  }

  export interface DropdownProps {
    id: string;
    title: string;
    value?: string;
    onChange?: (value: string) => void;
    children?: ReactNode;
    info?: string;
  }

  export interface DropdownItemProps {
    value: string;
    title: string;
  }

  export interface CheckboxProps {
    id: string;
    title: string;
    label: string;
    value?: boolean;
    onChange?: (value: boolean) => void;
    info?: string;
  }

  export interface DescriptionProps {
    title: string;
    text: string;
  }

  export namespace Toast {
    export enum Style {
      Success = "success",
      Failure = "failure",
      Animated = "animated",
    }
  }

  export const Form: {
    (props: FormProps): ReactElement;
    TextArea: (props: TextAreaProps) => ReactElement;
    TextField: (props: TextFieldProps) => ReactElement;
    Dropdown: {
      (props: DropdownProps): ReactElement;
      Item: (props: DropdownItemProps) => ReactElement;
    };
    Checkbox: (props: CheckboxProps) => ReactElement;
    Description: (props: DescriptionProps) => ReactElement;
    Separator: () => ReactElement;
  };

  export const ActionPanel: (props: ActionPanelProps) => ReactElement;
  export const Action: (props: ActionProps) => ReactElement;
  export const Clipboard: {
    copy: (text: string) => Promise<void>;
  };
  export const getPreferenceValues: <T = any>() => T;
  export const showToast: (options: any) => Promise<void>;
  export const showHUD: (message: string) => Promise<void>;
}
