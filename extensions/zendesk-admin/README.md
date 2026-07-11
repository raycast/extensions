# Zendesk Admin

A Raycast extension for comprehensive Zendesk administration. Search, view, and manage all aspects of your Zendesk instances directly from Raycast.

## Features

- **Search 14 entity types**: Tickets, Users, Organizations, Groups, Views, Brands, Triggers, Automations, Macros, Ticket Fields, Forms, Dynamic Content, Support Addresses, Custom Roles
- **Multi-instance support** with color coding
- **Real-time search** with smart filtering
- **Quick access** to all Zendesk products (Support, Guide, Admin, Explore, Sell, Chat, Talk)
- **User management**: Create, edit, view tickets, manage group memberships
- **Ticket management**: View details, open in browser, search related tickets
- **Configuration management**: View and edit automations, triggers, fields, brands

## Future Plans

- **More Create/Edit/Delete Actions**: For all entities (Users, Organizations, Tickets, Forms, etc.)
- **Additional Entities**: Custom objects, Help Center, Apps, Webhooks, SLAs, etc.
- **Smarter search**: More intuitive and accurate results for all entities.
- **Advanced Actions**: Assign users to groups, manage form fields, bulk ticket operations
- **AI Extension**: Smart search, automated actions, natural language interface

## Commands

- **Search Zendesk**: Main search interface for all entity types
- **Open Zendesk Instance**: Quick access to Zendesk products

## Setup

1. Install the extension
2. Configure Zendesk instances in Raycast preferences using comma-separated values, examples here:

### Required Fields:
- **Instance Names**: `My Company, Test Instance, Production`
- **Subdomains**: `yourcompany, testcompany, prodcompany`
- **API Users**: `api_user@yourcompany.com/token, test@testcompany.com/token, prod@prodcompany.com/token`
- **API Keys**: `your_api_key_1, your_api_key_2, your_api_key_3`

### Optional Fields:
- **Colors**: `#007bff, #28a745, #dc3545`
- **Production Flags**: `true, false, true`

**Important**: All comma-separated lists must have the same number of items. The extension will validate this and show an error if there's a mismatch.

## Usage

- Use "Search Zendesk" to find and manage entities across your instances
- Use "Open Zendesk Instance" for quick navigation to Zendesk products
- Switch between instances using the dropdown
- Use keyboard shortcuts for common actions

## Author

[Miguel Cordero Collar](https://github.com/miguelcorderocollar)
> This extension was developed with the help of [Gemini CLI](https://github.com/google-gemini/gemini-cli) and [Cursor](https://www.cursor.com/).
