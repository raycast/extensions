# Zoho Bookings Raycast Extension

Manage your Zoho Bookings appointments directly from Raycast.

## Features

- View upcoming appointments
- View available booking services
- Copy booking links to clipboard
- Self-client OAuth 2.0 authentication (no redirect URIs needed)
- Secure token storage using Raycast LocalStorage
- Automatic token refresh

## Setup

### 1. Create a Zoho Self Client

1. Go to [Zoho API Console](https://api-console.zoho.com)
2. Click on "Add Client" → "Self Client"
3. Enter a Client Name (e.g., "Raycast Extension")
4. Copy the **Client ID** and **Client Secret**

### 2. Configure Extension Preferences

1. Open Raycast preferences
2. Go to Extensions → Zoho Bookings
3. Enter your **Client ID**
4. Enter your **Client Secret**
5. Select your **Data Center** (e.g., US, EU, India, etc.)

### 3. Generate Authorization Code

1. Go back to [Zoho API Console](https://api-console.zoho.com)
2. Select your Self Client
3. Click on the "Generate Code" tab
4. Set the following:
   - **Scope**: `zohobookings.data.CREATE`
   - **Time Duration**: 3-10 minutes (this is how long the code is valid)
   - **Description**: Raycast Extension (optional)
5. Click "Create"
6. **Copy the generated code immediately** (it expires quickly!)

### 4. Authenticate in Raycast

1. Run the **Authenticate with Zoho** command in Raycast
2. Paste the authorization code you just copied
3. Press Enter to authenticate
4. You should see a success message

### 5. Start Using the Extension

You can now use:
- **View Appointments** - View your upcoming appointments
- **Browse Services** - View available booking services
- **Copy Booking Link** - Copy your consultant booking link
- **Log Out** - Clear authentication tokens

## Authentication Flow

This extension uses Zoho's **Self Client** OAuth 2.0 flow with LocalStorage:

### Why Self Client?

- **No Redirect URIs**: Self clients don't require redirect URIs, making them perfect for desktop applications
- **Simple Setup**: Generate authorization codes directly from the Zoho API Console
- **Secure**: Client credentials and tokens are stored locally in Raycast's secure storage

### How It Works

1. **Manual Code Generation**: You generate an authorization code manually from Zoho API Console using your self client
2. **Token Exchange**: The extension exchanges this code for access and refresh tokens using your client credentials
3. **Token Storage**: Tokens are stored securely in Raycast's LocalStorage (never exposed)
4. **Auto-Refresh**: Access tokens are automatically refreshed when they expire using the refresh token
5. **Persistent Auth**: You only need to authenticate once; the refresh token keeps you logged in indefinitely

## Troubleshooting

### "No refresh token found" error

Run the **Authenticate with Zoho** command again to re-authenticate.

### "Token exchange failed" error

- Make sure the authorization code hasn't expired (they're only valid for the duration you selected: 3-10 minutes)
- Generate a new code and try again immediately
- Verify your Client ID and Client Secret are correct in preferences
- Ensure you're using a **Self Client** (not Server-based or Web-based client)
- Verify the scope is set to `zohobookings.data.CREATE`

### "Token refresh failed" error

Your refresh token may have expired or been revoked. Run the **Authenticate with Zoho** command to re-authenticate.

## Commands

- **Authenticate with Zoho**: One-time authentication setup using self-client authorization code
- **View Appointments**: View your upcoming appointments
- **Browse Services**: View available booking services
- **Copy Booking Link**: Copy your consultant booking URL to clipboard
- **Log Out**: Clear all authentication tokens

## Support

For issues or questions, please visit the [Zoho Bookings API documentation](https://www.zoho.com/bookings/help/api/).