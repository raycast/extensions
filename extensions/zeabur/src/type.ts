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
