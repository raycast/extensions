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
  DOCUMENT_LABEL,
  buildDocumentReportUrl,
  dateError as dateFieldError,
  toIsoDay,
  describeDocumentReport,
  validateOrigin,
  type DocumentKind,
  type DocumentReport,
  type PlannedChange,
} from "./portal";
import { DateField } from "./components/DateField";

interface Preferences {
  portalUrl: string;
  locale?: string;
}

/**
 * "A Rezept just arrived" - the command this extension exists for.
 *
 * Fills in what the person reading the email knows (who it is from, which
 * document, when it arrived) and hands it to the portal, which creates the
 * Antrag if there is none, records the document as received on that date, and
 * advances the Antragsphase.
 *
 * The portal does the work and confirms it - this cannot, because it holds no
 * credential and gets no answer back (see `portal.ts`). So the summary below
 * is honest about the difference: it says what was *requested*, and the
 * browser tab says what *happened*.
 */
export default function ReportDocument() {
  const prefs = getPreferenceValues<Preferences>();
  const locale = prefs.locale ?? "de";
  const { push } = useNavigation();

  const [query, setQuery] = useState("");
  const [queryError, setQueryError] = useState<string | undefined>();
  const [document, setDocument] = useState<DocumentKind>("prescription");
  // Defaults to today: these commands record something that just happened.
  const [when, setWhen] = useState<Date | null>(() => new Date());
  const [dateError, setDateError] = useState<string | undefined>();

  const originError = validateOrigin(prefs.portalUrl ?? "");

  async function submit() {
    // Validate here rather than letting the portal ask: the point of the
    // command is that the browser opens already finished.
    let bad = false;
    if (!query.trim()) {
      setQueryError("Name oder E-Mail der Kontaktperson angeben.");
      bad = true;
    }
    // A document already in hand cannot have arrived tomorrow - that check
    // lives with the date logic, which the other commands share.
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
    const receivedOn = when ? toIsoDay(when) : null;
    if (bad || !receivedOn) return;

    const input: DocumentReport = {
      origin: prefs.portalUrl,
      locale,
      query,
      document,
      receivedOn,
    };
    const url = buildDocumentReportUrl(input);

    await open(url);
    push(
      <Submitted
        title={DOCUMENT_LABEL[document]}
        changes={describeDocumentReport(input)}
        url={url}
      />,
    );
  }

  return (
    <Form
      isLoading={false}
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
        title="Eingang melden"
        text="Der Antrag wird im Portal angelegt (falls nötig), das Dokument als erhalten erfasst und die Phase gesetzt. Das Portal bestätigt im Browser."
      />
      <Form.TextField
        id="query"
        title="Kontaktperson"
        placeholder="Name oder E-Mail-Adresse"
        info="Das Portal sucht damit den Kontakt. Eindeutig muss es sein - sonst fragt das Portal nach."
        value={query}
        error={queryError}
        onChange={(v) => {
          setQuery(v);
          if (queryError) setQueryError(undefined);
        }}
      />
      <Form.Dropdown
        id="document"
        title="Dokument"
        value={document}
        onChange={(v) => setDocument(v as DocumentKind)}
      >
        <Form.Dropdown.Item
          value="prescription"
          title={DOCUMENT_LABEL.prescription}
          icon={Icon.Receipt}
        />
        <Form.Dropdown.Item
          value="recommendation"
          title={DOCUMENT_LABEL.recommendation}
          icon={Icon.Document}
        />
      </Form.Dropdown>
      <DateField
        id="receivedOn"
        title="Eingang am"
        info="Wann das Dokument tatsächlich ankam - nicht wann es erfasst wird."
        value={when}
        error={dateError}
        onChange={(v) => {
          setWhen(v);
          if (dateError) setDateError(undefined);
        }}
      />
      <Form.Separator />
      <Form.Description
        title="Weg"
        text={
          document === "prescription"
            ? "Weg B – Rezept. Die Pflegeempfehlung wird als nicht zutreffend erfasst."
            : "Weg A – Pflegeberatung. Das Rezept wird als nicht zutreffend erfasst."
        }
      />
    </Form>
  );
}

/**
 * What was sent, after the browser has been opened.
 *
 * Deliberately worded as a request, not a result. This extension never learns
 * the outcome, and a panel that said "erledigt" would be claiming knowledge it
 * does not have - the browser tab is the only place the truth appears.
 */
function Submitted({
  title,
  changes,
  url,
}: {
  title: string;
  changes: PlannedChange[];
  url: string;
}) {
  const markdown = [
    `# An das Portal übergeben`,
    ``,
    `**${title}**`,
    ``,
    `Der Browser ist offen und führt die Änderungen aus. Dort steht, ob es`,
    `geklappt hat - und falls noch etwas fehlt, wird es dort abgefragt.`,
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
