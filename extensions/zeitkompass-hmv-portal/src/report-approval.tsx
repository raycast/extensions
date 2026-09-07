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
  buildApprovalReportUrl,
  describeApprovalReport,
  validateOrigin,
  type ApprovalReport,
  type PlannedChange,
} from "./portal";

interface Preferences {
  portalUrl: string;
  locale?: string;
}

/**
 * "Die Pflegekasse hat bewilligt" - sets the Antragsphase to *Bewilligt*.
 *
 * The shortest command in the extension, and deliberately so. A
 * Bewilligungsbescheid tells the person reading it exactly one thing: the
 * outcome. It says nothing about whether the Rezept was ever ticked off in the
 * portal, and nothing about which day anything happened - so this asks for the
 * Kontaktperson and nothing else.
 *
 * No document answers. A claim can reach a decision with gaps earlier in its
 * record, and filling them in from here would be inventing values nobody
 * looked at - the silent default `docs/adr/0001` forbids. The portal asks on
 * screen if it needs them, where they can be answered honestly.
 *
 * No date either: the `approved` stage defines no catch-up field to hold one
 * (see `claim-stage-catchup.ts`), so a picker would collect a day the portal
 * has nowhere to write.
 */
export default function ReportApproval() {
  const prefs = getPreferenceValues<Preferences>();
  const locale = prefs.locale ?? "de";
  const { push } = useNavigation();

  const [query, setQuery] = useState("");
  const [queryError, setQueryError] = useState<string | undefined>();

  const originError = validateOrigin(prefs.portalUrl ?? "");

  async function submit() {
    // Validated here rather than in the portal: the point of the command is
    // that the browser opens already finished.
    let bad = false;
    if (!query.trim()) {
      setQueryError("Name oder E-Mail der Kontaktperson angeben.");
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
    if (bad) return;

    const input: ApprovalReport = { origin: prefs.portalUrl, locale, query };
    const url = buildApprovalReportUrl(input);

    await open(url);
    push(<Submitted changes={describeApprovalReport(input)} url={url} />);
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
        title="Bewilligung melden"
        text="Der Antrag wird im Portal angelegt (falls nötig) und auf „Bewilligt“ gesetzt. Das Portal bestätigt am Antrag."
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
      <Form.Separator />
      <Form.Description
        title="Dokumente"
        text="Werden hier nicht angefasst. Fehlt am Antrag noch etwas (Weg, Rezept, Pflegeempfehlung), fragt das Portal danach - dort kann es beantwortet werden."
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
    `**Bewilligung**`,
    ``,
    `Der Browser ist offen. Am Antrag steht, ob die Phase gesetzt ist und ob`,
    `das Portal noch etwas wissen will.`,
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
