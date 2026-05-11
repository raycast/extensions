export type APIErrorResponse = {
  message: string;
};

enum ProjectPlatform {
  web = "web",
  ios = "ios",
  android = "android",
  macos = "macos",
}
export enum ProjectStatus {
  Active = "active",
  Archived = "archived",
}
export type Project = {
  id: string;
  name: string;
  updated: number;
  platform: ProjectPlatform;
  thumbnail: string;
  status: ProjectStatus;
  organization?: Organization;
  number_of_members: number;
  number_of_screens: number;
  number_of_components: number;
  number_of_connected_components: number;
  number_of_text_styles: number;
  number_of_colors: number;
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
