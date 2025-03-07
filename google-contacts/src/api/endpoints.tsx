import fetch from "node-fetch";
import { Contact, ContactForm, ContactGroup } from "../types";
import { client } from "./oauth";
import { getResourceId } from "../utils";

// API Constants
const PEOPLE_API_BASE = "https://people.googleapis.com/v1";
const PERSON_FIELDS = "names,emailAddresses,phoneNumbers,addresses,organizations,biographies,photos,urls,birthdays,userDefined,metadata";
const CONTACT_GROUP_FIELDS = "metadata,groupType,name,memberCount";

// API

export async function fetchContactGroups(): Promise<ContactGroup[]> {
  const response = await fetch(`${PEOPLE_API_BASE}/contactGroups?groupFields=${CONTACT_GROUP_FIELDS}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  
  if (!response.ok) {
    console.error("Fetch contact groups error:", await response.text());
    throw new Error(response.statusText);
  }
  
  const json = (await response.json()) as {
    contactGroups: ContactGroup[];
    nextPageToken?: string;
    totalItems?: number;
  };
  
  return json.contactGroups || [];
}

export async function fetchContacts(maxResults = 1000, filter = ""): Promise<Contact[]> {
  let allContacts: Contact[] = [];
  let nextPageToken: string | undefined = undefined;
  const pageSize = 100; // API max is 100 per page
  const maxPageRetries = 3; // Maximum number of retries per page
  
  try {
    // Initial authorization - only done once before pagination starts
    const authToken = (await client.getTokens())?.accessToken;
    if (!authToken) {
      console.error("No auth token available");
      return [];
    }
    
    let pageCount = 0;
    let continuePageFetching = true;
    
    // Continue fetching pages until we have all contacts, reach the limit,
    // or determine we should stop due to errors
    while (continuePageFetching && allContacts.length < maxResults) {
      pageCount++;
      let pageRetries = 0;
      let pageSuccess = false;
      
      // Retry logic for each page
      while (pageRetries < maxPageRetries && !pageSuccess) {
        try {
          const params = new URLSearchParams();
          params.append("personFields", PERSON_FIELDS);
          params.append("pageSize", pageSize.toString());
          
          // Add page token if we have one (for pages after the first)
          if (nextPageToken) {
            params.append("pageToken", nextPageToken);
          }
          
          const response = await fetch(`${PEOPLE_API_BASE}/people/me/connections?${params.toString()}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            // We can't set a timeout directly with fetch, but we'll handle errors gracefully
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Fetch contacts error (page ${pageCount}, attempt ${pageRetries + 1}):`, errorText);
            
            // For certain errors, we might want to stop completely
            if (response.status === 401 || response.status === 403) {
              throw new Error(`Authentication error: ${response.statusText}`);
            }
            
            pageRetries++;
            if (pageRetries >= maxPageRetries) {
              console.error(`Failed to fetch page ${pageCount} after ${maxPageRetries} attempts, stopping pagination`);
              continuePageFetching = false;
              break;
            }
            
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          
          const json = (await response.json()) as {
            connections: Contact[];
            nextPageToken?: string;
            totalItems?: number;
          };
          
          // Add this page of contacts to our collection
          if (json.connections && json.connections.length > 0) {
            allContacts = [...allContacts, ...json.connections];
            console.log(`Added ${json.connections.length} contacts from page ${pageCount}`);
          } else {
            console.log(`Page ${pageCount} returned no contacts`);
          }
          
          // Update page token for next iteration
          nextPageToken = json.nextPageToken;
          
          // If no next page token, we've reached the end
          if (!nextPageToken) {
            console.log("No more pages available, pagination complete");
            continuePageFetching = false;
          }
          
          pageSuccess = true;
          
        } catch (pageError) {
          console.error(`Error during page ${pageCount} fetch (attempt ${pageRetries + 1}):`, pageError);
          pageRetries++;
          
          if (pageRetries >= maxPageRetries) {
            console.error(`Failed to fetch page ${pageCount} after ${maxPageRetries} attempts, stopping pagination`);
            continuePageFetching = false;
            break;
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // If we've reached the maximum requested results, stop
      if (allContacts.length >= maxResults) {
        console.log(`Reached maximum requested results (${maxResults}), stopping pagination`);
        break;
      }
    }
  } catch (error) {
    console.error("Critical error in fetchContacts:", error);
    // Don't throw, return whatever contacts we've fetched so far
  }
  
  console.log(`Fetched ${allContacts.length} total contacts across ${nextPageToken ? 'multiple' : '1'} pages`);
  return allContacts;
}

export async function fetchContactsInGroup(groupResourceName: string, maxResults = 100): Promise<Contact[]> {
  const groupId = getResourceId(groupResourceName);
  const params = new URLSearchParams();
  params.append("personFields", PERSON_FIELDS);
  params.append("pageSize", maxResults.toString());
  
  const response = await fetch(`${PEOPLE_API_BASE}/contactGroups/${groupId}/members?${params.toString()}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  
  if (!response.ok) {
    console.error("Fetch contacts in group error:", await response.text());
    throw new Error(response.statusText);
  }
  
  const json = (await response.json()) as {
    memberResourceNames: string[];
    nextPageToken?: string;
  };
  
  if (!json.memberResourceNames || json.memberResourceNames.length === 0) {
    return [];
  }
  
  // Now fetch the actual contact details for each member resource name
  const contacts: Contact[] = [];
  for (const resourceName of json.memberResourceNames) {
    try {
      const contact = await fetchContact(resourceName);
      contacts.push(contact);
    } catch (error) {
      console.error(`Error fetching contact ${resourceName}:`, error);
    }
  }
  
  return contacts;
}

export async function fetchContact(resourceName: string): Promise<Contact> {
  const personId = getResourceId(resourceName);
  const params = new URLSearchParams();
  params.append("personFields", PERSON_FIELDS);
  
  const response = await fetch(`${PEOPLE_API_BASE}/people/${personId}?${params.toString()}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  
  if (!response.ok) {
    console.error("Fetch contact error:", await response.text());
    throw new Error(response.statusText);
  }
  
  return (await response.json()) as Contact;
}

export async function createContact(contactData: ContactForm): Promise<Contact> {
  const response = await fetch(`${PEOPLE_API_BASE}/people:createContact`, {
    method: "POST",
    body: JSON.stringify(contactData),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  
  if (!response.ok) {
    console.error("Create contact error:", await response.text());
    throw new Error(response.statusText);
  }
  
  return (await response.json()) as Contact;
}

export async function updateContact(resourceName: string, contactData: Partial<ContactForm>, updatePersonFields: string): Promise<Contact> {
  const personId = getResourceId(resourceName);
  
  // First, fetch the contact to get its etag
  const currentContact = await fetchContact(resourceName);
  
  // Add the etag to the update data - required by Google API to prevent concurrent update conflicts
  const updateDataWithEtag = {
    ...contactData,
    etag: currentContact.etag,
  };
  
  const params = new URLSearchParams();
  params.append("updatePersonFields", updatePersonFields);
  
  const response = await fetch(`${PEOPLE_API_BASE}/people/${personId}:updateContact?${params.toString()}`, {
    method: "PATCH",
    body: JSON.stringify(updateDataWithEtag),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Update contact error:", errorText);
    throw new Error(response.statusText);
  }
  
  return (await response.json()) as Contact;
}

export async function deleteContact(resourceName: string): Promise<void> {
  const personId = getResourceId(resourceName);
  
  const response = await fetch(`${PEOPLE_API_BASE}/people/${personId}:deleteContact`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  
  if (!response.ok) {
    console.error("Delete contact error:", await response.text());
    throw new Error(response.statusText);
  }
}

// This function is no longer needed as we use local favorites now
// Keeping a stub to avoid breaking existing code
export async function toggleFavorite(contact: Contact): Promise<Contact> {
  console.log("Using local favorites instead of Google API favorites");
  // Simply return the contact without modifying it
  return contact;
}
