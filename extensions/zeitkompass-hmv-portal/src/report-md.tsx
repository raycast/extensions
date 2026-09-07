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
  buildMdReportUrl,
  describeMdReport,
  validateOrigin,
  type MdReport,
  type PlannedChange,
} from "./portal";

interface Preferences {
  portalUrl: string;
  locale?: string;
}

/**
 * "The Medizinischer Dienst is now involved" - moves the Antrag to
 * *Wartet auf MD-Begutachtung*.
 *
 * For a claim that is **filed with the Pflegekasse** and now has an external
 * assessment running. That is a single-step forward move in
 * `CLAIM_STAGE_ORDER`, so the portal normally has only one question - which MD
 * - and answers it itself with the generic company unless you ask to pick.
 *
 * Deliberately *not* for a claim in a Widerspruch. There the main stage stays
 * `objection` for the whole objection and an external review is carried by the
 * Widerspruch phase `waiting_for_objection_review` instead, so the MD stage now
 * sits *before* `objection` in the pipeline. Firing this at such a claim is
 * refused by the portal with "der Antrag ist schon weiter" - correct, and
 * clearer than moving it would be.
 *
 * No date field: entry to this stage is recorded by the stage change and the MD
 * association, and the portal's catch-up asks for no date here. Inventing one
 * would mean writing a property that does not exist.
 */
export default function ReportMd() {
  const prefs = getPreferenceValues<Preferences>();
  const locale = prefs.locale ?? "de";
  const { push } = useNavigation();

  const [query, setQuery] = useState("");
  const [queryError, setQueryError] = useState<string | undefined>();
  const [chooseMd, setChooseMd] = useState(false);

  const originError = validateOrigin(prefs.portalUrl ?? "");

  async function submit() {
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

    const input: MdReport = {
      origin: prefs.portalUrl,
      locale,
      query,
      chooseMd,
    };
    const url = buildMdReportUrl(input);

    await open(url);
    push(<Submitted changes={describeMdReport(input)} url={url} />);
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
        title="MD-Beteiligung melden"
        text="Der eingereichte Antrag wird auf „Wartet auf MD-Begutachtung“ gesetzt und der Medizinische Dienst hinterlegt. Das Portal bestätigt am Antrag."
      />
      <Form.TextField
        id="query"
        title="Kontaktperson"
        placeholder="Name oder E-Mail-Adresse"
        info="Das Portal sucht damit Antrag oder Kontakt. Gedacht für bei der Kasse eingereichte Anträge - nicht für laufende Widersprüche."
        value={query}
        error={queryError}
        onChange={(v) => {
          setQuery(v);
          if (queryError) setQueryError(undefined);
        }}
      />
      <Form.Separator />
      <Form.Checkbox
        id="chooseMd"
        title="Medizinischer Dienst"
        label="Im Portal auswählen"
        info="Ohne Haken wird der Standard-MD hinterlegt - am Antrag jederzeit auf den regionalen MD änderbar. Die Auswahlliste kennt nur das Portal, deshalb passiert sie dort."
        value={chooseMd}
        onChange={setChooseMd}
      />
    </Form>
  );
}

/**
 * What was sent, after the browser has been opened. Worded as a request: the
 * extension gets no answer back, and the claim page carries the receipt that
 * confirms the MD association and the stage from real state.
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
    `**MD-Beteiligung melden**`,
    ``,
    `Der Browser ist offen. Am Antrag steht, welcher Medizinische Dienst`,
    `hinterlegt wurde und ob die Phase gesetzt ist.`,
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
