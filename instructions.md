# Project Overview
The Raycast Firestore Manager is a Raycast extension that enables seamless interaction with Google Firestore using a Firebase service account. It provides a quick and efficient way to manage Firestore collections directly from the Raycast interface.

### Key Features:
- 🔍 **List Documents** – Retrieve all documents from a Firestore collection.
- 🎯 **Filter & Search** – Query documents based on specific fields and values.
- ✏️ **View & Edit** – Quickly inspect and update document fields.
- ➕ **Add & Delete** – Create new documents and remove existing ones.
- ⚡ **Fast & Secure** – Uses Firebase service account for direct API access.

### Tech Stack
- **TypeScript**
- **React**
- **Node**
- **Raycast API**

# Core Functionalities

### 1. Firebase Service Account Setup  
**User Interaction:**  
- When the extension opens for the first time, prompt the user to **paste their Firebase service account JSON**.  
- Once submitted, save the credentials locally and do not ask again.  
- Provide an option to **reset credentials** from the settings.  

**Implementation:**  
- Validate the JSON format and required fields (`project_id`, `private_key`, `client_email`, etc.).  
- Store credentials securely using Raycast’s local storage API.  
- Allow users to reconfigure the service account later if needed.  

---
### 2. Listing Firestore Documents  
**User Interaction:**  
- The user selects **"List Documents"** from the extension.  
- The extension prompts for the **collection name**.  
- Upon submission, it fetches and displays all documents in the collection.  

**Implementation:**  
- Use Firestore Admin SDK to retrieve documents.  
- Display a scrollable list of document IDs.  
- Allow users to select a document to **view details**.  

---

### 3. Viewing Document Details  
**User Interaction:**  
- The user clicks on a document from the listed results.  
- The extension opens a detailed view showing all fields and values.  

**Implementation:**  
- Fetch the document data using Firestore Admin SDK.  
- Display key-value pairs in a structured format.  
- Provide an option to **edit or delete** the document.  

---

### 4. Filtering & Searching Documents  
**User Interaction:**  
- The user selects **"Filter Documents"** from the extension.  
- The extension prompts for:  
  1. **Collection name**  
  2. **Field name** to filter by  
  3. **Comparison operator** (`==`, `>`, `<`, `>=`, `<=`)  
  4. **Value** to filter against  
- The extension lists documents matching the criteria.  

**Implementation:**  
- Construct Firestore queries dynamically based on user input.  
- Display filtered results in the list view.  

---

### 5. Reconfiguring Firebase Service Account  
**User Interaction:**  
- The user selects **"Settings" → "Reset Service Account"**.  
- The extension prompts them to enter a new Firebase service account JSON.  
- Upon submission, the credentials are updated locally.  

**Implementation:**  
- Replace the stored credentials with the new input.  
- Ensure smooth transition without affecting existing operations.  

---

# Current Project Structure

```
│── /src                   # Main source code
│   │── /api               # Firebase service calls (Firestore, Auth, etc.)
│   │── /commands          # Raycast command implementations
│   │── /hooks             # Custom hooks (if needed)
│   │── /utils             # Helper functions (date formatting, etc.)
│   │── index.ts           # Entry point for the extension
│── /config                # Configuration files (Firebase setup, API keys)
│── /types                 # TypeScript types and interfaces
│── package.json           # Dependencies and scripts
│── tsconfig.json          # TypeScript configuration
│── .env                   # Environment variables (service account keys)
│── README.md              # Project documentation
```

