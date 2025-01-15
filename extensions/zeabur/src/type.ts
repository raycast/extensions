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
export interface ProjectAndService {
  projectID: string;
  serviceID: string;
  justCreated: boolean;
}

export interface DeployResult {
  projectID: string;
  domain: string;
}

export interface CreateTemporaryProjectResponse {
  data?: {
    createTemporaryProject: {
      _id: string;
    };
  };
  errors?: Array<{ message: string }>;
}

export interface CreateServiceResponse {
  data?: {
    createService: {
      _id: string;
    };
  };
  errors?: Array<{ message: string }>;
}

export interface GetEnvironmentResponse {
  data?: {
    environments: Array<{
      _id: string;
    }>;
  };
  errors?: Array<{ message: string }>;
}

export interface CreateDomainResponse {
  data?: {
    addDomain: {
      domain: string;
    };
  };
  errors?: Array<{ message: string }>;
}

export interface GetDomainResponse {
  data?: {
    service: {
      domains: Array<{
        domain: string;
      }>;
    };
  };
  errors?: Array<{ message: string }>;
}
