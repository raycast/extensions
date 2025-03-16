import * as admin from "firebase-admin";

export interface FirestoreDocument {
  id: string;
  [key: string]: admin.firestore.DocumentData[keyof admin.firestore.DocumentData];
}

export type WhereFilterOp = admin.firestore.WhereFilterOp;
