import * as admin from "firebase-admin";

export interface FirestoreDocument {
  id: string;
  [key: string]: any; // Allow dynamic fields since Firestore documents are schemaless
}

export type WhereFilterOp = admin.firestore.WhereFilterOp; 