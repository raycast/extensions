import { useState } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  open,
  showToast,
  Toast,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import {
  buildHandoverReportUrl,
  dateError as dateFieldError,
  toIsoDay,
  describeHandoverReport,
  validateOrigin,
  type HandoverReport,
  type PlannedChange,
} from "./portal";
import { DateField } from "./components/DateField";

interface Preferences {
  portalUrl: string;
  locale?: string;
}

/**
 * "The Antrag has gone to the Versorgungspartner" - sets the Antragsphase to
 * *An Versorgungspartner übergeben* and records the day it happened.
 *
 * The mail to the partner is sent by hand, so the person who sent it is the
 * only one who knows it went out - and they regularly type it up the next
 * morning, which is why the date is asked rather than assumed. It lands on the
 * claim's handoff date, which the portal fills only while it is still empty:
 * an acceptance already recorded is never overwritten, and when the partner
 * later accepts, the handoff page stamps that day over this one.
 *
 * Sends no Antrags-Versorger: the portal's ask for it is optional, so the link
 * commits without one, and who the partner is belongs on the deal card rather
 * than in a guess made here.
 */
export default function RecordHandover() {
  const prefs = getPreferenceValues<Preferences>();
  const locale = prefs.locale ?? "de";
  const { push } = useNavigation();

  const [query, setQuery] = useState("");
  const [queryError, setQueryError] = useState<string | undefined>();
  // Defaults to today: these commands record something that just happened.
  const [when, setWhen] = useState<Date | null>(() => new Date());
  const [dateError, setDateError] = useState<string | undefined>();

  const originError = validateOrigin(prefs.portalUrl ?? "");

  async function submit() {
    // Validated here rather than in the portal: the point of the command is
    // that the browser opens already finished.
    let bad = false;
    if (!query.trim()) {
      setQueryError("Name oder E-Mail der Kontaktperson angeben.");
      bad = true;
    }
    const badDate = dateFieldError(when);
    if (badDate) {
      setDateError(badDate);
      bad = true;
    }
    if (originError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Portal URL prüfen",
        message: originError,
      });
      bad = true;
    }
    const handedOverOn = when ? toIsoDay(when) : null;
    if (bad || !handedOverOn) return;

    const input: HandoverReport = {
      origin: prefs.portalUrl,
      locale,
      query,
      handedOverOn,
    };
    const url = buildHandoverReportUrl(input);

    await open(url);
    push(<Submitted changes={describeHandoverReport(input)} url={url} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Im Portal Ausführen"
            icon={Icon.Checkmark}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Übergabe melden"
        text="Der Antrag wird im Portal angelegt (falls nötig), auf „An Versorgungspartner übergeben“ gesetzt und das Übergabedatum hinterlegt. Das Portal bestätigt am Antrag."
      />
      <Form.TextField
        id="query"
        title="Kontaktperson"
        placeholder="Name oder E-Mail-Adresse"
        info="Das Portal sucht damit Antrag oder Kontakt. Eindeutig muss es sein - sonst fragt das Portal nach."
        value={query}
        error={queryError}
        onChange={(v) => {
          setQuery(v);
          if (queryError) setQueryError(undefined);
        }}
      />
      <DateField
        id="handedOverOn"
        title="Übergabe am"
        info="Wann die Unterlagen tatsächlich an den Versorgungspartner gingen - nicht wann es erfasst wird."
        value={when}
        error={dateError}
        onChange={(v) => {
          setWhen(v);
          if (dateError) setDateError(undefined);
        }}
      />
      <Form.Separator />
      <Form.Description
        title="Antrags-Versorger"
        text="Wird hier nicht gesetzt - am Antrag im Portal auswählbar. Fehlt am Antrag noch etwas (Weg, Rezept, Pflegeempfehlung), fragt das Portal danach."
      />
    </Form>
  );
}

/**
 * What was sent, after the browser has been opened.
 *
 * Worded as a request, not a result: the extension holds no credential and
 * gets no answer back, so the claim page's receipt - built from the claim's
 * real state - is the only place the outcome appears.
 */
function Submitted({
  changes,
  url,
}: {
  changes: PlannedChange[];
  url: string;
}) {
  const markdown = [
    `# An das Portal übergeben`,
    ``,
    `**Übergabe an Versorgungspartner**`,
    ``,
    `Der Browser ist offen. Am Antrag steht, welches Übergabedatum hinterlegt`,
    `wurde und ob die Phase gesetzt ist.`,
    ``,
    `## Angefordert`,
    ``,
    ...changes.map((c) => `- **${c.label}:** ${c.value}`),
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Portal Erneut Öffnen" url={url} />
          <Action.CopyToClipboard title="Link Kopieren" content={url} />
        </ActionPanel>
      }
    />
  );
}
