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

## Start Meeting with a Personal Meeting ID

By default, the **Start Meeting** command creates a new instant meeting with a random meeting ID each time. If you prefer to always start your own personal meeting, set your [Personal Meeting ID (PMI)](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0068443) in the command's preferences:

- **Set**: Start Meeting opens your personal meeting room directly and copies `https://zoom.us/j/<your-pmi>` to your clipboard. No Zoom sign-in is required for this. Spaces and dashes in the ID are ignored (e.g. `123 456 7891` works).
- **Empty** (default): Start Meeting keeps the existing behavior and creates a new instant meeting.
- **Invalid** (not 9–11 digits): Start Meeting shows an error and does nothing.

Note: the copied personal meeting link does not include a passcode. Participants are only prompted for one if you have configured a separate passcode for your personal meeting room.

## Limitations

Upcoming meetings are fetched from both Zoom's scheduled meetings endpoint and Zoom's upcoming meetings endpoint:

- `GET /users/me/meetings?type=upcoming&page_size=300` returns meetings scheduled by the signed-in user.
- `GET /users/me/upcoming_meetings` can include meetings the signed-in user is invited to join, but Zoom only returns meetings within the next 24 hours.

Because of that Zoom API limitation, invited meetings further in the future may not appear in the extension. For a complete list of all upcoming meetings, a calendar extension may be more reliable.
