import { InputType } from "./input-type";

export interface InputParam {
  key: string;
  type: InputType;
  optional: boolean;
  name?: string;
  label?: string;
  placeholder?: string;
  description?: string;
  defaultValue?: unknown;
  value?: unknown;
  details?: {
    values: unknown | unknown[];
  };
}

export interface ParseInputResponse {
  ok: true;
  code: string;
  params: InputParam[];
}

export interface ParseInputError {
  ok: false;
  code: string;
  error: unknown;
}

export type InputParamDetail = {
  properties: {
    key: string;
    details: {
      type: InputType;
      // any additional details...
    };
  }[];
};
