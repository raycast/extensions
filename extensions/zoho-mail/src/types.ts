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
export interface Folder {
  folderName: string;
  folderId: string;
}
export interface EmailMessage {
  subject: string;
  messageId: number;
  folderId: number;
  size: string;
  receivedTime: string;
  fromAddress: string;
  status: "0" | "1";
}

export interface Result<T> {
  status: {
    code: number;
    description: string;
  };
  data: T;
}
