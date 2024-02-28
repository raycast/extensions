export type ConnectorType = "github" | "github-app" | "slack" | "openai" | "zendesk";

export type UserAuthConnectorType = "github" | "slack";

export type UserAuthConnector = {
  type: UserAuthConnectorType;
  appId: string;
  isUserAuthRequired: boolean;
  clientId?: string;
  userScopes: string[];
  workspaceScopes: string[];
  appConnectorUserAuths: Required<{
    encryptedAccessToken: string;
    connectorType: string;
    metadata: unknown;
  }>[];
};
