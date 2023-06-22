export type APIErrorResponse = {
  message: string;
};

export type Project = {
  id: string;
  name: string;
  updated: number;
  platform: string;
  organization?: Organization;
};

export type Organization = {
  id: string;
  name: string;
  logo: string;
};

export type User = {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  emotar?: string;
};
