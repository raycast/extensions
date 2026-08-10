# Zoom

Start, schedule and join Zoom meetings.

## Features

- Start an instant Zoom meeting and copy the join URL to your clipboard.
- Schedule new Zoom meetings from Raycast.
- Join a meeting directly from a meeting ID.
- View upcoming meetings grouped by date.
- See this week's meetings from the menu bar.
- Open, edit, delete, refresh, or copy details for meetings in the upcoming meetings list.
- Use Raycast AI tools to get upcoming meetings, create meeting links, schedule meetings, edit meetings, delete meetings, and join meetings.

## Commands

- **Schedule Meeting**: Create a scheduled Zoom meeting.
- **Start Meeting**: Create and open an instant Zoom meeting.
- **Upcoming Meetings**: Browse your upcoming Zoom meetings.
- **Join Meeting**: Open Zoom with a meeting ID.
- **This Week's Meetings**: Show this week's Zoom meetings in the menu bar.

## Authentication

The extension uses Raycast's Zoom OAuth integration. The first command that needs Zoom access will ask you to sign in to Zoom and authorize Raycast. After that, Raycast stores and refreshes the access token for future commands.

## Limitations

Upcoming meetings are fetched from both Zoom's scheduled meetings endpoint and Zoom's upcoming meetings endpoint:

- `GET /users/me/meetings?type=upcoming&page_size=300` returns meetings scheduled by the signed-in user.
- `GET /users/me/upcoming_meetings` can include meetings the signed-in user is invited to join, but Zoom only returns meetings within the next 24 hours.

Because of that Zoom API limitation, invited meetings further in the future may not appear in the extension. For a complete list of all upcoming meetings, a calendar extension may be more reliable.
