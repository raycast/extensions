# Zeitkompass HMV Portal - Raycast extension

Four commands for the steps that happen in the mail client, so a Kontaktperson's
Rezept or Ablehnungsbescheid - and the handover to the Versorgungspartner - can
be recorded without opening the portal and searching for them.

| Command | What it does |
| --- | --- |
| **Report Received Prescription / Recommendation** | Creates the Antrag if there is none, records the Rezept or Pflegeempfehlung as received on a given date, sets the Weg, and advances the Antragsphase to "Empfehlung / Rezept liegt vor". |
| **Start Widerspruch** | Creates the Antrag if there is none, opens the Widerspruch, and can request the Erstinformationen with an email draft in the same step. |
| **Record Distributor Handover** | Sets the Antragsphase to "An Versorgungspartner übergeben" and records the day the Unterlagen went out. |
| **Report MD Involvement** | Moves a **filed** Antrag to "Wartet auf MD-Begutachtung" and attaches the Medizinischer Dienst. Not for one in a Widerspruch - see below. |

Every command takes the Kontaktperson (name or e-mail address) and, where a day
is part of what is being recorded, a date - **Heute / Gestern / Anderes
Datum**. The two answers that come up nearly every time are one keystroke, and
the calendar only opens for the day that is genuinely further back.

Every command works whether or not the Kontaktperson already has an Antrag: it
is created only when there is none, and either way the stage and fields are
updated. A **backward** move is refused by the portal's pipeline - the Rezept
command cannot drag a filed Antrag back - and it says so rather than failing
silently.

## How it works, and what it cannot do

The extension **holds no API key**. It builds a URL and opens it in your
browser; your existing portal session is what authorizes the work. Nothing to
leak, nothing to rotate, and the portal's audit log records *you* rather than an
integration.

The consequence is worth being clear about: **nothing comes back.** The portal
does the writing and reports the result, and it does so where you end up - the
browser forwards to the claim's own page, which shows a receipt card at the top
of the action zone listing what changed. That card is built from the claim's
real state (stage, checklist row, arrival date, objection stage), so it reports
rather than asserts: if something fell short, it turns to a warning and names
which line.

The panel this *extension* shows after submitting says what was **requested**,
not what happened, because it genuinely does not know. The claim page is the
source of truth.

The commands are designed so the browser is already finished when you look at
it. They send answers for every question the portal's skip-ahead normally asks
the Weg, the document status, the arrival date - so a Rezept report completes
with no interaction. If something is still missing (an ambiguous name, an
unusual stage), the portal asks for that one thing in the tab.

The portal only runs the work automatically when the navigation came from an
app rather than a web page (`Sec-Fetch-Site: none`). Launching from Raycast
qualifies. See `docs/claim-import-link.md` in the portal repo for why.

A link is **single-use**: the portal strips its own query string the moment it
acts, so reloading the tab, reopening it, or restoring the session does not run
the command again. Firing the command from Raycast again builds a fresh link
and works normally.

## Setup

1. Set **Portal URL** in the extension preferences - the bare origin, e.g.
   `https://portal.inclusys.de`, with no path.
2. Set **Language** if the portal is not served in German.

### Why https, and why localhost is exempt

The link carries a Kontaktperson's name or email, so a typo'd host would put
personal data on the wire in clear text. That is the whole reason for the rule
which is also why **loopback is allowed over http**:

```
http://localhost:3000        ✓
http://127.0.0.1:3000        ✓
http://[::1]:3000            ✓
http://app.localhost:3000    ✓
http://192.168.1.5:3000      ✗   on the network, and unencrypted
http://localhost.evil.com    ✗   not loopback, whatever it is called
```

Nothing leaves the machine on loopback, so there is nothing to intercept. This
is the same set browsers themselves treat as a secure context, rather than a
looser rule invented here.

Everything else must be https, and a URL with a path is refused either way.

`Sec-Fetch-Site: none` behaves identically against a local portal, so the
automatic run works the same in development as in production.

You need an admin session in the browser with the `admin.claims.create`
permission. If you are signed out, the link lands on the sign-in page and the
details are lost - sign in, then re-run the command.

## Development

```bash
npm install
npm run dev      # ray develop - loads the extension into Raycast
npm test         # vitest, the URL builders
npx tsc --noEmit # types
npx ray lint     # Raycast conventions + Prettier
```

`src/portal.ts` holds all the logic and is the only tested file - the URL
contracts and the date resolution (`resolveDateChoice`, `dateChoiceError`). The
commands are thin Raycast views on top of it, which is deliberate: those two
things are the part worth testing, and they need no Raycast runtime.
`src/components/DateChoiceField.tsx` is the shared date control, so the four
commands cannot drift apart on what "Gestern" means.

### Known `ray lint` complaints

All are expected; none affects `ray develop`:

- **`Invalid author "inclusys"`.** `author` must be a real raycast.com
  username, validated against Raycast's API. **Replace it with yours** before
  publishing or before expecting `ray lint` to pass. It is a placeholder - a
  guessed username would point at somebody else's account.
- **Two title-case warnings**, both ignored on purpose - Raycast's title-caser
  does not know about acronyms:
  - `Expected "Zeitkompass Hmv Portal"` - HMV is the Hilfsmittelverzeichnis.
  - `Expected "Report Md Involvement"` - MD is the Medizinischer Dienst.

  Writing either as "Hmv" / "Md" would be wrong in the domain's own vocabulary
  (see `docs/glossary.md` in the portal repo).

### Keeping the URL contract in sync

`src/portal.ts` mirrors the portal's own `buildImportLink`
(`src/features/claim-intake/import-link.ts`) and `buildObjectionLink`
(`src/features/objection/objection-link.ts`). The duplication is deliberate -
this is a separate package that ships to a laptop - but it means a change to a
catch-up field key on the portal side has to be made here too. The keys in play:

| Key | Meaning |
| --- | --- |
| `q` | Name or email to resolve the Kontaktperson |
| `stage` | Target Antragsphase |
| `a.routed.claim_route` | `prescription` (Weg B) or `care_consultation` (Weg A) |
| `a.document.<type>` | `received` / `waived` / `not_applicable` |
| `a.document.<type>.date` | Arrival date, `YYYY-MM-DD`, optional |
| `a.distributor_invited.handoff_at` | Übergabedatum, `YYYY-MM-DD` - written to the claim's handoff date while that is still empty |
| `rejectionDate` | Ablehnungsdatum for the Widerspruch link |
| `erstinformation`, `email` | Request the Erstinformationen, and open its draft |
| `ask` | Show the catch-up form even when nothing is missing |

An unknown `a.` key is ignored by the portal rather than failing, so adding one
here ahead of the portal is safe; a *renamed* one silently stops taking effect,
which is the case to watch.

### Where the Übergabedatum lands

`Record Distributor Handover` writes its date to the claim's
`handoff_completed_at` - the same property the "Wann hat der Versorgungspartner
angenommen?" catch-up fills one stage later. The portal only writes it while it
is **still empty**, so an acceptance date already on the claim is never
overwritten, and when the partner later accepts, the handoff page stamps the
acceptance day over this one. That is the right precedence: the property carries
when the claim left our hands, and the accept is the authoritative event for it.

The command sends no Antrags-Versorger. That ask is optional, so the link
commits without one, and who the partner is belongs on the deal card. What is
*not* optional is anything still missing further back - the Weg, the Rezept, the
Pflegeempfehlung - so a claim that never got past `open` lands on the catch-up
form rather than committing half-recorded.

### The MD command is for filed Anträge only

The MD stage sits *before* `objection` in the portal's pipeline, because that is
when it happens: the Kasse files, then has the MD assess. Inside a Widerspruch
the main stage stays `objection` for the whole objection and an external review
is carried by the Widerspruch phase `waiting_for_objection_review` instead.

So firing this command at an Antrag in a Widerspruch is refused by the portal -
"der Antrag ist schon weiter als die angeforderte Phase", with a link to the
Antrag. That is the right answer, not a bug.

### The MD command sends no MD

`Report MD Involvement` deliberately answers nothing for
`waiting_for_md_review.md`. The field's options are HubSpot company ids, which
the extension cannot read - but it does not need to: the field declares the
generic Medizinischer Dienst as its `defaultValue`, which the portal treats as
the honest fallback when the regional MD is not yet known. So the command
completes silently with the generic company, and the MD stays changeable on the
claim afterwards.

Ticking **Im Portal auswählen** sends `ask=1` instead, which tells the portal
to show the catch-up form even though nothing is missing - that is how you pick
a named MD. The extension forwards the decision rather than trying to make it.

## Why the answers are not "silent defaults"

The portal's [ADR-0001](../docs/adr/0001-shared-stage-transition-pipeline.md)
forbids guessing a catch-up value - a systematic default would bias later
analysis rather than reflect what happened case by case.

What these commands send is not a guess. Somebody read the email and stated
what they saw: this document arrived, on this date. The Weg follows from the
document type, and the other document is then genuinely not applicable. The
line the ADR draws is whether a human looked, not whether a human typed - so
the form pre-selects today's date and you change it when the post was slow.
