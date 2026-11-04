# Zemtu Raycast Extension

A powerful Raycast extension that enables Zemtu carsharing and mobility solution users to manage their vehicles and reservations directly from Raycast. You need a Zemtu account from your carsharing provider to use it.

## Features

### 🚗 Vehicle Management
- **Vehicle List**: Browse all available vehicles in your area
- **Time-Based Search**: Find vehicles available within specific time ranges
- **Vehicle Details**: Access comprehensive information for each vehicle
- **Location-Based Results**: Get vehicles sorted by proximity to your location

### 📅 Reservation Management
- **My Reservations**: View and manage all your upcoming reservations
- **Quick Booking**: Instantly book available vehicles with just a few clicks
- **Reservation Details**: Access complete booking information and status
- **Menu Bar Integration** (macOS only): Keep track of current and upcoming reservations in your menu bar

### 🤖 Raycast AI
- **Natural Language Booking**: Ask `@zemtu` to find and book vehicles, with a confirmation before every booking

### ⚡ Quick Actions
- **Instant Loading**: The last vehicle list appears immediately and refreshes in the background
- **Seamless Integration**: Native Raycast experience with keyboard shortcuts

## Installation

1. Install the extension from the Raycast Store
2. Configure your Zemtu credentials in the extension preferences:
   - **Zemtu URL**: Your provider's Zemtu address, e.g. `https://yourcompany.zemtu.com` (default: `https://demo.zemtu.com`)
   - **Username**: Your Zemtu account username
   - **Password**: Your Zemtu account password
   - **Your Location** (optional): An address or coordinates, used to sort vehicles by distance
3. Run **Check Settings** to make sure everything works

## Available Commands

| Command | Description |
|---------|-------------|
| `List Vehicles` | Display all available vehicles in your area |
| `Find Vehicles in Time Range` | Search for vehicles available during specific time periods |
| `My Reservations` | View and manage your current and upcoming reservations |
| `Menu Bar Reservations` | Show current and upcoming reservations in the menu bar (macOS only) |
| `Check Settings` | Test the Zemtu URL, login, location and vehicle access, with a hint for anything that needs fixing |

## Keyboard Shortcuts

Windows uses `Ctrl` where macOS uses `⌘`.

| Where | Action | macOS | Windows |
|-------|--------|-------|---------|
| Everywhere | Open the actions menu | `⌘K` | `Ctrl+K` |
| Lists and details | Run the first action | `↵` | `Enter` |
| Lists and details | Run the second action, e.g. Book Vehicle or Edit Reservation | `⌘↵` | `Ctrl+Enter` |
| Forms | Search, book or save | `⌘↵` | `Ctrl+Enter` |
| List Vehicles | Refresh | `⌘R` | `Ctrl+R` |
| Search results | New search | `⌘N` | `Ctrl+N` |
| Vehicle and reservation details | Open in Maps | `⌘M` | `Ctrl+M` |
| My Reservations and reservation details | Delete a reservation (always asks first) | `⌘D` | `Ctrl+D` |
| Check Settings | Check again | `⌘R` | `Ctrl+R` |

In forms, `↵` stays with the focused field, e.g. it opens the date picker.

## Raycast AI

Mention `@zemtu` in Raycast AI to search and book in plain language, e.g.

- "Which cars are free tomorrow from 9 to 12?"
- "Buch mir morgen von 9 bis 12 Uhr das nächste freie Auto"
- "Is there an electric car near me this afternoon from 2 to 5?"
- "What are my upcoming reservations?"

### How it works

The extension gives Raycast AI three tools. The AI decides which ones to call based on your request:

| Tool | What it does | Changes anything? |
|------|--------------|-------------------|
| Find Available Vehicles | Asks Zemtu which vehicles are free for the whole requested time range (optionally narrowed by name, brand or city), sorted by distance if your location is set | No |
| Get My Reservations | Lists your current and upcoming reservations | No |
| Create Reservation | Books a vehicle for a time range | Yes, only after you confirm |

A booking request like *"Book me the nearest free car tomorrow from 9 to 12"* runs like this:

1. **Understand the request**: The AI turns "tomorrow from 9 to 12" into exact dates in your local timezone. If something is unclear (e.g. "tomorrow morning" without times, or which of several cars), it asks you instead of guessing.
2. **Search**: It calls *Find Available Vehicles* for exactly that time range. Zemtu checks availability on the server, including buffer times and existing reservations.
3. **Pick a vehicle**: It chooses from the search results only, e.g. the closest one. Vehicle IDs are never made up.
4. **Confirm**: Before anything is booked, Raycast shows a confirmation with the vehicle, license plate, address, start and end written out in full (e.g. "Saturday, October 24, 2026, 09:00"), purpose and note. Nothing happens until you confirm. If you cancel, no reservation is created.
5. **Book**: Right before booking, the extension checks once more that the vehicle is still free, then creates the reservation and the AI tells you the result.

### Safeguards

- Every booking needs your explicit confirmation in Raycast.
- Invalid dates, a start in the past or an end before the start are rejected before anything is booked.
- If the vehicle was taken in the meantime, the booking is aborted and nothing is reserved.
- Bookings are marked as business trips only if you explicitly say so; otherwise they are personal.
- The access PIN of your reservations is never passed to the AI.

### Requirements

Raycast AI requires a Raycast Pro subscription. The extension's regular commands work without it.

## Configuration

### Required Settings
- **Username & Password**: Your Zemtu account credentials
- **Zemtu URL**: Your provider's Zemtu address, e.g. `https://yourcompany.zemtu.com`

### Optional Settings
- **Your Location**: Enter an address (e.g. `Marktplatz 1, Dornbirn`) or coordinates (e.g. `47.4486, 9.7621`). To get coordinates, right-click a place in Google Maps and click the numbers to copy them. With a location set, the vehicle list and `@zemtu` sort vehicles by distance.
- **Menu Bar** (macOS only): Toggle menu bar reservation display

## System Requirements

- Raycast (latest version recommended) on macOS or Windows
- The Menu Bar Reservations command is only available on macOS; all other commands also work on Windows
- Active Zemtu account with valid credentials

## Privacy & Security

Your password is stored in Raycast's encrypted preferences. The extension talks directly to your Zemtu server; the login token is kept in Raycast's encrypted local storage and the last vehicle list in its local cache, so the extension starts quickly. Reservations are not cached on disk because they contain the access PIN, and copying a PIN keeps it out of Raycast's clipboard history.

If you enter an address as your location, it is looked up once via OpenStreetMap (Nominatim) to get its coordinates; the result is cached locally. Coordinates are used as they are and never sent anywhere.

When you use `@zemtu` in Raycast AI, the results of the tools (vehicle names, addresses, times of your reservations) are sent to the AI model through Raycast to answer your request. Reservation PINs and your credentials are never included. The regular commands don't use AI.

## Support

For issues or questions:
- Contact your Zemtu provider for account-related problems
- Create an issue in this repository for extension-specific bugs
- Check the Raycast community for general usage help

## License

MIT License
