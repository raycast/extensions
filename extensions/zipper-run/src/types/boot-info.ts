import { InputParam } from "./input-params";
import { UserAuthConnector } from "./user-auth-connector";

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

export type InputParams = InputParam[];

export type EntryPointInfo = {
  filename: string;
  editUrl: string;
};

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
