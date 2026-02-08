interface EmailAddress {
  "isAlias": boolean
  "isPrimary": boolean
  "mailId": string
  "isConfirmed": boolean
}
export interface Account {
  emailAddress: EmailAddress[]
  accountId: number
  displayName: string
}
export interface Result<T> {
  "status": {
    "code": number
    "description": string
  }
  data: T;
}