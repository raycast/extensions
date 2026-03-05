// Type definitions for the search documentation
export interface Language {
  locale: string;
  name: string;
}

export interface Documentation {
  [locale: string]: {
    [section: string]: {
      [topic: string]: string;
    };
  };
}

// Type definitions for the deploy project
export interface CreateUploadSessionResponse {
  presign_url: string;
  presign_header: Record<string, string>;
  upload_id: string;
}

export interface PrepareUploadResponse {
  url: string;
}

export interface ErrorResponse {
  error: string;
}

// Type definitions for the zeabur graphql API
export interface Template {
  data: {
    templates: {
      edges: {
        node: TemplateInfo;
      }[];
    };
  };
}

export interface TemplateInfo {
  code: string;
  name: string;
  description: string;
  iconURL: string;
  deploymentCnt: number;
  services: [];
}

export interface Project {
  data: {
    projects: {
      edges: {
        node: ProjectInfo;
      }[];
    };
  };
}

export interface ProjectInfo {
  name: string;
  description: string;
  iconURL: string;
  _id: string;
  region: {
    providerInfo: {
      code: string;
      icon: string;
      name: string;
      __typename: string;
    } | null;
    name: string;
    id: string;
    country: string;
    city: string;
    continent: string;
    __typename: string;
  };
  environments: {
    _id: string;
    name: string;
    __typename: string;
  }[];
}

export interface ProjectWithServices {
  project: ProjectInfo;
  services: ServiceInfo[];
}

export interface ProjectServices {
  data: {
    project: {
      services: ServiceInfo[];
    };
  };
}

export interface ServiceInfo {
  _id: string;
  name: string;
  spec: {
    icon: string;
  };
  status: string;
  domain: string;
  groupName: string;
  groupIndex: number;
}

export interface ServiceStatus {
  data: {
    service: {
      status: string;
    };
  };
}

export interface DomainData {
  data: {
    service: {
      domains: {
        domain: string;
      }[];
    };
  };
}

export interface Groups {
  data: {
    project: {
      groups: {
        name: string;
        serviceIDs: string[];
      }[];
    };
  };
}

export interface Deployments {
  data: {
    deployments: {
      edges: DeploymentInfo[];
    };
  };
}

export interface DeploymentInfo {
  cursor: string;
  node: {
    _id: string;
    status: string;
    commitMessage: string;
    createdAt: string;
    finishedAt: string;
    serviceID: string;
    environmentID: string;
  };
}

export interface DeploymentWithContext {
  deployment: DeploymentInfo;
  projectId: string;
  projectName: string;
  serviceName: string;
}

export interface DeleteProject {
  data: {
    deleteProject: boolean;
  };
}

export interface DeleteService {
  data: {
    deleteService: boolean;
  };
}

export interface SuspendService {
  data: {
    suspendService: boolean;
  };
}

export interface RestartService {
  data: {
    restartService: boolean;
  };
}

export interface RedeployService {
  errors: {
    message: string;
  }[];
  data: {
    redeployService: boolean;
  };
}

export interface ProjectUsage {
  data: {
    projectUsage: {
      usages: {
        entity: string;
        usage: number;
      }[];
      budget: number;
    };
  };
}

export interface Servers {
  data: {
    servers: ServerInfo[];
  };
}

export interface ServerInfo {
  _id: string;
  name: string;
  providerInfo: {
    icon: string;
    __typename: string;
    code: string;
    console: string;
    homepage: string;
    name: string;
  };
  ip: string;
  sshPort: number;
  sshUsername: string;
  continent: string;
  country: string;
  city: string;
  createdAt: string;
  isAutoRenewDisabled: boolean;
  isManaged: boolean;
  __typename: string;
}

export interface ServerWithStatus {
  data: {
    server: ServerWithStatusInfo;
  };
}

export interface ServerWithStatusInfo {
  _id: string;
  status: {
    isOnline: boolean;
    totalCPU: number;
    totalMemory: number;
    usedCPU: number;
    usedMemory: number;
    warnings: string[];
    vmStatus: string;
    __typename: string;
  };
  __typename: string;
}

// AI Hub Types
export interface AIHubKey {
  keyID: string;
  alias: string;
  cost: number;
  __typename: string;
}

export interface AIHubTenantInfo {
  balance: number;
  keys: AIHubKey[];
  providerCustomerID: string;
  provider: string;
  autoRechargeThreshold: number;
  autoRechargeAmount: number;
  __typename: string;
}

export interface AIHubTenant {
  data: {
    aihubTenant: AIHubTenantInfo;
  };
}

export interface AIHubDailyUsage {
  date: string;
  spend: number;
  __typename: string;
}

export interface AIHubMonthlyUsageInfo {
  totalSpend: number;
  dailyUsage: AIHubDailyUsage[];
  __typename: string;
}

export interface AIHubMonthlyUsage {
  data: {
    aihubMonthlyUsage: AIHubMonthlyUsageInfo;
  };
}

// AIHub Spend Logs Types
export interface AIHubSpendLog {
  timestamp: string;
  cost: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  model: string;
  keyAlias: string;
  __typename: string;
}

export interface AIHubSpendLogsPaginatedInfo {
  data: AIHubSpendLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  __typename: string;
}

export interface AIHubSpendLogsPaginated {
  data: {
    aihubSpendLogsPaginated: AIHubSpendLogsPaginatedInfo;
  };
}

// Zeabur Email Types
export interface ZeaburEmailAttachment {
  filename: string;
  content: string; // base64 encoded
  content_type: string;
}

export interface ZeaburEmailPayload {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  reply_to?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: ZeaburEmailAttachment[];
  headers?: Record<string, string>;
  tags?: Record<string, string>;
  scheduled_at?: string; // ISO 8601, only for scheduled endpoint
}

export interface ZeaburEmailResponse {
  id: string;
  message_id?: string;
  status: string;
}

export interface ZeaburEmailScheduleResponse {
  id: string;
  status: string;
}

export interface ZeaburEmailErrorResponse {
  error: string;
  message?: string;
}
