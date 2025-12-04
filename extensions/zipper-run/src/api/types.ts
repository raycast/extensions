import { EntryPointInfo, InputParams } from "../types/boot-info";
import { UserAuthConnector } from "../types/user-auth-connector";

export type BootInfo = {
  app: AppInfo;
  userAuthConnectors: UserAuthConnector[];
  inputs: InputParams;
  userInfo: {
    email?: string;
    userId?: string;
  };
  runnableScripts: string[];
  metadata?: Record<string, string | undefined>;
  entryPoint: EntryPointInfo;
};

export type AppInfo = {
  id: string;
  slug: string;
  name: string | null;
  description: string | null;
  updatedAt: Date | null;
  canUserEdit: boolean;
  isDataSensitive: boolean;
  playgroundVersionHash: string | null;
  publishedVersionHash: string | null;
  appAuthor?: {
    name: string;
    organization: string;
    image: string;
    orgImage: string;
  };
};
export type BootInfoResult =
  | {
      ok: true;
      data: BootInfo;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export interface InputParam {
  key: string;
  type: string;
  name?: string;
  description?: string;
  details?: {
    values: Array<string | { key: string; value: string }>;
  };
}

export interface AppletArguments {
  appletName: string;
  scriptName?: string;
}

export interface AppResultsProps {
  appResults: Record<string, object | string | []> | string;
}

export interface Description {
  title: string;
  body: string;
}

export interface InputDescription {
  description: string;
  label: string;
}

export interface ScriptConfig {
  description?: Description;
  inputs?: { [inputName: string]: InputDescription };
}

export interface AppletConfigs {
  configs: { [scriptName: string]: ScriptConfig };
}
export type Values = {
  textfield: string;
  textarea: string;
  datepicker: Date;
  checkbox: boolean;
  dropdown: string;
  tokeneditor: string[];
};
