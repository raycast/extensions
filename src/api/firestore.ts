import * as admin from "firebase-admin";
import { getFirestore } from "../utils/firebase";
import { FirestoreDocument } from "../types/firestore";

/**
 * Helper function to add a small delay
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches all collection names from Firestore
 */
export async function getCollections(): Promise<string[]> {
  // Add a small delay to ensure Firebase is initialized
  await delay(500);

  const firestore = await getFirestore();
  if (!firestore) {
    throw new Error("Firestore is not initialized. Please set up your service account.");
  }

  try {
    const collections = await firestore.listCollections();
    return collections.map((collection) => collection.id);
  } catch (error) {
    console.error("Error fetching collections:", error);
    throw new Error("Failed to fetch collections");
  }
}

/**
 * Fetches all documents from a collection
 */
export async function getDocuments(collectionName: string): Promise<FirestoreDocument[]> {
  const db = await getFirestore();
  if (!db) {
    throw new Error("Firestore is not initialized. Please set up your service account.");
  }

  try {
    const snapshot = await db.collection(collectionName).get();
    return snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error fetching documents from ${collectionName}:`, error);
    throw new Error(`Failed to fetch documents from ${collectionName}`);
  }
}

/**
 * Fetches a single document by ID
 */
export async function getDocument(
  collectionName: string,
  documentId: string,
): Promise<admin.firestore.DocumentData | null> {
  const firestore = await getFirestore();
  if (!firestore) {
    throw new Error("Firestore is not initialized. Please set up your service account.");
  }

  try {
    const doc = await firestore.collection(collectionName).doc(documentId).get();
    if (!doc.exists) {
      return null;
    }
    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error(`Error fetching document ${documentId} from ${collectionName}:`, error);
    throw new Error(`Failed to fetch document ${documentId} from ${collectionName}`);
  }
}

/**
 * Queries documents based on field and value
 */
export async function queryDocuments(
  collectionName: string,
  field: string,
  operator: admin.firestore.WhereFilterOp,
  value: any,
  limit?: number,
): Promise<admin.firestore.DocumentData[]> {
  const firestore = await getFirestore();
  if (!firestore) {
    throw new Error("Firestore is not initialized. Please set up your service account.");
  }

  try {
    let query: admin.firestore.Query = firestore.collection(collectionName).where(field, operator, value);

    // Apply limit if provided
    if (limit !== undefined && limit > 0) {
      query = query.limit(limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error(`Error querying documents from ${collectionName}:`, error);
    throw new Error(`Failed to query documents from ${collectionName}`);
  }
}

/**
 * Creates a new document in a collection
 */
export async function createDocument(collectionName: string, data: Record<string, any>): Promise<string> {
  const firestore = await getFirestore();
  if (!firestore) {
    throw new Error("Firestore is not initialized. Please set up your service account.");
  }

  try {
    const docRef = await firestore.collection(collectionName).add(data);
    return docRef.id;
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw new Error(`Failed to create document in ${collectionName}`);
  }
}

/**
 * Updates an existing document
 */
export async function updateDocument(
  collectionName: string,
  documentId: string,
  data: Record<string, any>,
): Promise<void> {
  const firestore = await getFirestore();
  if (!firestore) {
    throw new Error("Firestore is not initialized. Please set up your service account.");
  }

  try {
    await firestore.collection(collectionName).doc(documentId).update(data);
  } catch (error) {
    console.error(`Error updating document ${documentId} in ${collectionName}:`, error);
    throw new Error(`Failed to update document ${documentId} in ${collectionName}`);
  }
}

/**
 * Deletes a document
 */
export async function deleteDocument(collectionName: string, documentId: string): Promise<void> {
  const firestore = await getFirestore();
  if (!firestore) {
    throw new Error("Firestore is not initialized. Please set up your service account.");
  }

  try {
    await firestore.collection(collectionName).doc(documentId).delete();
  } catch (error) {
    console.error(`Error deleting document ${documentId} from ${collectionName}:`, error);
    throw new Error(`Failed to delete document ${documentId} from ${collectionName}`);
  }
}
