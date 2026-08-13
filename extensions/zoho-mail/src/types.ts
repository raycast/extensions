interface EmailAddress {
  isAlias: boolean;
  isPrimary: boolean;
  mailId: string;
  isConfirmed: boolean;
}
export interface Account {
  emailAddress: EmailAddress[];
  accountId: number;
  displayName: string;
}
export interface EmailMessage {
  subject: string;
  messageId: number;
  fromAddress: string;
  folderId: number;
  status: "0" | "1";
}

export interface Result<T> {
  status: {
    code: number;
    description: string;
  };
  data: T;
}
