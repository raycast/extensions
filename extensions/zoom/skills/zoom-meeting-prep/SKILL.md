---
name: zoom-meeting-prep
description: Use when a user wants a preparation brief for upcoming Zoom meetings based on their scheduled meeting details and any context they provide.
---

# Meeting prep

## When to use

Use for preparing the next meeting, a day's meetings, or an upcoming meeting by topic.
The available read tool supplies meeting metadata, not transcripts or participant history.
Preparation is read-only and returns a brief in chat.

## Workflow

1. Establish the requested meeting or date range and the user's timezone.
   Resolve “today” or “next” from the current date available in the conversation;
   ask if the timezone or range is unclear.
2. Call `get-upcoming-meetings` with no inputs. Inspect the returned IDs, topics,
   start times, durations, timezones, agendas, and join links where present.
   Filter to the requested period using the returned timestamps.
3. If multiple meetings match a named topic, show their dates and ask which one
   to prepare. If none match, report that none were found in the returned list.
   Do not claim the list includes meetings unavailable to this account.
4. Build a factual header from the selected meeting's returned metadata.
   Label missing agenda or duration as unavailable. Use additional context supplied
   by the user, keeping it distinct from what the Zoom tools returned.
5. Propose a concise objective, discussion order, preparation checklist, and questions.
   Tie suggestions to the actual topic or agenda. If the topic is vague, keep the
   suggestions general and ask what decision the meeting needs to reach.
6. For multiple meetings, order briefs chronologically and flag overlaps only when
   both start time and duration are available. Include the timezone in all times.

## Output

- Meeting topic, date, start time, timezone, duration, and returned join link.
- Known agenda and user-supplied context.
- Suggested objective, preparation tasks, and questions to bring.
- Missing information and any conflicts visible in the returned schedule.

## Do not

- Do not invent attendees, prior decisions, transcripts, or meeting documents.
- Do not create, edit, delete, or join meetings as part of preparation.
- Do not present a proposed agenda or objective as an existing meeting fact.
