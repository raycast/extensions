import React, { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  open,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import {
  InvoiceRecord,
  ListPreferences,
  deleteInvoice,
  loadInvoices,
  loadListPreferences,
  saveListPreferences,
  updateInvoiceRecord,
  updateInvoiceStatus,
} from "./storage";
import {
  UpdateInvoiceParams,
  getInvoiceStatus,
  isValidEmail,
  sendInvoice,
  updateDueDate,
  updateInvoice,
} from "./paypal";

// ── Status display helpers ──────────────────────────────────────────────────

const STATUS_ORDER = ["DRAFT", "SENT", "UNPAID", "OVERDUE", "PAID", "CANCELLED"];

const STATUS_COLOR: Record<string, Color> = {
  DRAFT: Color.SecondaryText,
  SENT: Color.Blue,
  UNPAID: Color.Orange,
  OVERDUE: Color.Red,
  PAID: Color.Green,
  CANCELLED: Color.SecondaryText,
};

const STATUS_ICON: Record<string, Icon> = {
  DRAFT: Icon.Document,
  SENT: Icon.Envelope,
  UNPAID: Icon.Clock,
  OVERDUE: Icon.ExclamationMark,
  PAID: Icon.Checkmark,
  CANCELLED: Icon.XMarkCircle,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAmount(currency: string, total: number): string {
  return `${currency} ${total.toFixed(2)}`;
}

// ── Grouping & sorting ──────────────────────────────────────────────────────

function groupInvoices(
  invoices: InvoiceRecord[],
  groupBy: ListPreferences["groupBy"],
): Record<string, InvoiceRecord[]> {
  const groups: Record<string, InvoiceRecord[]> = {};

  for (const invoice of invoices) {
    let key: string;
    switch (groupBy) {
      case "status":
        key = invoice.status;
        break;
      case "recipient":
        key = invoice.recipientName;
        break;
      case "currency":
        key = invoice.currency;
        break;
      case "month":
        key = new Date(invoice.createdAt).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
        break;
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(invoice);
  }

  return groups;
}

function sortInvoices(
  invoices: InvoiceRecord[],
  sortBy: ListPreferences["sortBy"],
  order: ListPreferences["order"],
): InvoiceRecord[] {
  const sorted = [...invoices].sort((a, b) => {
    switch (sortBy) {
      case "createdAt":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "amount":
        return a.total - b.total;
      case "recipient":
        return a.recipientName.localeCompare(b.recipientName);
    }
  });
  return order === "desc" ? sorted.reverse() : sorted;
}

// ── Set Due Date form ───────────────────────────────────────────────────────

function SetDueDateForm({
  invoice,
  onUpdate,
}: {
  invoice: InvoiceRecord;
  onUpdate: (changes: Partial<InvoiceRecord>) => void;
}) {
  const { pop } = useNavigation();
  const [dueDate, setDueDate] = useState<Date | null>(invoice.dueDate ? new Date(invoice.dueDate) : null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setIsLoading(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Updating due date…" });
      const dueDateStr = dueDate ? dueDate.toISOString().split("T")[0] : null;
      await updateDueDate(invoice.invoiceId, dueDateStr);
      await updateInvoiceRecord(invoice.invoiceId, {
        dueDate: dueDateStr ?? undefined,
      });
      onUpdate({ dueDate: dueDateStr ?? undefined });
      await showToast({ style: Toast.Style.Success, title: "Due date updated" });
      pop();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update due date",
        message: String(err),
      });
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Due Date" icon={Icon.Calendar} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Set Due Date"
        text={`Update the due date for invoice to ${invoice.recipientName}. Leave blank to remove the due date.`}
      />
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        value={dueDate}
        onChange={setDueDate}
        type={Form.DatePicker.Type.Date}
      />
    </Form>
  );
}

// ── Edit Invoice form ───────────────────────────────────────────────────────

interface EditLineItem {
  id: string;
  name: string;
  description: string;
  quantity: string;
  price: string;
}

let editItemCounter = 0;
function newEditItem(): EditLineItem {
  return {
    id: String(++editItemCounter),
    name: "",
    description: "",
    quantity: "1",
    price: "",
  };
}

function calcTotal(items: EditLineItem[], taxPercent: string): number {
  const subtotal = items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
  }, 0);
  const tax = taxPercent ? subtotal * (parseFloat(taxPercent) / 100) : 0;
  return subtotal + tax;
}

function EditInvoiceForm({
  invoice,
  onUpdate,
}: {
  invoice: InvoiceRecord;
  onUpdate: (changes: Partial<InvoiceRecord>) => void;
}) {
  const { pop } = useNavigation();

  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(invoice.dueDate ? new Date(invoice.dueDate) : null);
  const [taxPercent, setTaxPercent] = useState("");
  const [taxName, setTaxName] = useState("");
  const [allowTip, setAllowTip] = useState(false);
  const [allowPartialPayment, setAllowPartialPayment] = useState(false);
  const [notifyRecipient, setNotifyRecipient] = useState(false);
  const [items, setItems] = useState<EditLineItem[]>([newEditItem()]);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  function addItem() {
    setItems((prev) => [...prev, newEditItem()]);
  }

  function updateItem(id: string, field: keyof Omit<EditLineItem, "id">, value: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
    if (field === "name" || field === "price") {
      setItemErrors((prev) => {
        const next = { ...prev };
        delete next[`${id}-${field}`];
        return next;
      });
    }
  }

  function validate(): boolean {
    let valid = true;
    const errors: Record<string, string> = {};
    for (const item of items) {
      if (!item.name.trim()) {
        errors[`${item.id}-name`] = "Item name required";
        valid = false;
      }
      if (!item.price || isNaN(parseFloat(item.price)) || parseFloat(item.price) <= 0) {
        errors[`${item.id}-price`] = "Valid price required";
        valid = false;
      }
    }
    setItemErrors(errors);
    return valid;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setIsLoading(true);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Updating invoice…" });

      const newTotal = calcTotal(items, taxPercent);
      const dueDateStr = dueDate ? dueDate.toISOString().split("T")[0] : undefined;

      const params: UpdateInvoiceParams = {
        invoiceId: invoice.invoiceId,
        recipientName: invoice.recipientName,
        recipientEmail: invoice.recipientEmail,
        currency: invoice.currency,
        note: note.trim() || undefined,
        dueDate: dueDateStr,
        taxPercent: taxPercent ? parseFloat(taxPercent) : undefined,
        taxName: taxName.trim() || undefined,
        allowTip,
        allowPartialPayment,
        notifyRecipient,
        items,
      };

      await updateInvoice(params);
      await updateInvoiceRecord(invoice.invoiceId, {
        total: newTotal,
        dueDate: dueDateStr,
      });
      onUpdate({ total: newTotal, dueDate: dueDateStr });

      await showToast({ style: Toast.Style.Success, title: "Invoice updated" });
      pop();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update invoice",
        message: String(err),
      });
      setIsLoading(false);
    }
  }

  const subtotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
    0,
  );
  const taxAmount = taxPercent ? subtotal * (parseFloat(taxPercent) / 100) : 0;
  const total = subtotal + taxAmount;
  const fmt = (n: number) => `${invoice.currency} ${n.toFixed(2)}`;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Checkmark} onSubmit={handleSubmit} />
          <Action
            title="Add Line Item"
            icon={Icon.Plus}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "n" },
              Windows: { modifiers: ["ctrl"], key: "n" },
            }}
            onAction={addItem}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Edit Invoice"
        text={`Editing invoice for ${invoice.recipientName}. Recipient email cannot be changed here.`}
      />

      <Form.Separator />

      <Form.Description title="Invoice Details" text="Update the due date and note for this invoice." />
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        value={dueDate}
        onChange={setDueDate}
        type={Form.DatePicker.Type.Date}
      />
      <Form.TextArea
        id="note"
        title="Note to Customer"
        placeholder="e.g. Thanks for your business!"
        value={note}
        onChange={setNote}
      />

      <Form.Separator />

      <Form.Description title="Line Items" text="Press ⌘N (Mac) or Ctrl+N (Windows) to add another item." />
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <Form.TextField
            id={`item-name-${item.id}`}
            title={`Item ${index + 1} — Name`}
            placeholder="e.g. Logo design"
            value={item.name}
            error={itemErrors[`${item.id}-name`]}
            onChange={(v) => updateItem(item.id, "name", v)}
          />
          <Form.TextArea
            id={`item-desc-${item.id}`}
            title="Description (optional)"
            placeholder="Additional details"
            value={item.description}
            onChange={(v) => updateItem(item.id, "description", v)}
          />
          <Form.TextField
            id={`item-qty-${item.id}`}
            title="Quantity"
            placeholder="1"
            value={item.quantity}
            onChange={(v) => updateItem(item.id, "quantity", v)}
          />
          <Form.TextField
            id={`item-price-${item.id}`}
            title="Unit Price"
            placeholder="0.00"
            value={item.price}
            error={itemErrors[`${item.id}-price`]}
            onChange={(v) => updateItem(item.id, "price", v)}
          />
          {index < items.length - 1 && <Form.Separator />}
        </React.Fragment>
      ))}

      <Form.Separator />

      <Form.Description title="Tax" text="Leave blank to remove tax from this invoice." />
      <Form.TextField id="taxName" title="Tax Name" placeholder="e.g. VAT, GST" value={taxName} onChange={setTaxName} />
      <Form.TextField
        id="taxPercent"
        title="Tax Rate (%)"
        placeholder="e.g. 10"
        value={taxPercent}
        onChange={setTaxPercent}
      />

      <Form.Separator />

      <Form.Description title="Payment Options" text="" />
      <Form.Checkbox
        id="allowTip"
        title="Allow Tip"
        label="Let the customer add a tip"
        value={allowTip}
        onChange={setAllowTip}
      />
      <Form.Checkbox
        id="allowPartialPayment"
        title="Allow Partial Payment"
        label="Let the customer pay a partial amount"
        value={allowPartialPayment}
        onChange={setAllowPartialPayment}
      />

      <Form.Separator />

      <Form.Checkbox
        id="notifyRecipient"
        title="Notify Client"
        label="Send the client an email about these changes"
        value={notifyRecipient}
        onChange={setNotifyRecipient}
      />

      <Form.Separator />

      <Form.Description
        title="Summary"
        text={[
          `Subtotal   ${fmt(subtotal)}`,
          taxPercent ? `${taxName || "Tax"} (${taxPercent}%)   ${fmt(taxAmount)}` : "",
          `─────────────────`,
          `Total        ${fmt(total)}`,
        ]
          .filter(Boolean)
          .join("\n")}
      />
    </Form>
  );
}

// ── Picker forms ────────────────────────────────────────────────────────────

function PickerForm<T extends string>({
  title,
  options,
  current,
  onSelect,
}: {
  title: string;
  options: { value: T; label: string; icon: Icon }[];
  current: T;
  onSelect: (value: T) => void;
}) {
  const { pop } = useNavigation();
  return (
    <List>
      {options.map((opt) => (
        <List.Item
          key={opt.value}
          icon={opt.value === current ? { source: Icon.Checkmark, tintColor: Color.Green } : opt.icon}
          title={opt.label}
          actions={
            <ActionPanel>
              <Action
                title={`Set ${title} to ${opt.label}`}
                onAction={() => {
                  onSelect(opt.value);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// ── Main command ────────────────────────────────────────────────────────────

export default function MyInvoicesCommand() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [prefs, setPrefs] = useState<ListPreferences>({
    groupBy: "status",
    sortBy: "createdAt",
    order: "desc",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const [records, savedPrefs] = await Promise.all([loadInvoices(), loadListPreferences()]);
      setInvoices(records);
      setPrefs(savedPrefs);
      setIsLoading(false);

      const toRefresh = records.filter((r) => r.status !== "PAID" && r.status !== "CANCELLED");
      for (const record of toRefresh) {
        try {
          const { status, invoicerViewUrl } = await getInvoiceStatus(record.invoiceId);
          const normalized = status as InvoiceRecord["status"];
          if (normalized !== record.status) {
            await updateInvoiceStatus(record.invoiceId, normalized);
            setInvoices((prev) =>
              prev.map((i) => (i.invoiceId === record.invoiceId ? { ...i, status: normalized, invoicerViewUrl } : i)),
            );
          }
        } catch {
          // silently skip
        }
      }
    }
    load();
  }, [refreshKey]);

  async function updatePrefs(changes: Partial<ListPreferences>) {
    const updated = { ...prefs, ...changes };
    setPrefs(updated);
    await saveListPreferences(updated);
  }

  function updateLocalInvoice(invoiceId: string, changes: Partial<InvoiceRecord>) {
    setInvoices((prev) => prev.map((i) => (i.invoiceId === invoiceId ? { ...i, ...changes } : i)));
  }

  async function handleCopyLink(invoice: InvoiceRecord) {
    try {
      if (invoice.payerViewUrl) {
        await Clipboard.copy(invoice.payerViewUrl);
        await showHUD("Invoice link copied ✓");
      } else {
        await showToast({ style: Toast.Style.Animated, title: "Generating link…" });
        const url = await sendInvoice(invoice.invoiceId, false);
        await updateInvoiceStatus(invoice.invoiceId, "UNPAID", url);
        updateLocalInvoice(invoice.invoiceId, { status: "UNPAID", payerViewUrl: url });
        await Clipboard.copy(url);
        await showHUD("Invoice link copied ✓");
      }
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
    }
  }

  async function handleSend(invoice: InvoiceRecord) {
    if (!invoice.recipientEmail) return;
    try {
      await showToast({ style: Toast.Style.Animated, title: "Sending…" });
      const url = await sendInvoice(invoice.invoiceId, true);
      await updateInvoiceStatus(invoice.invoiceId, "SENT", url);
      updateLocalInvoice(invoice.invoiceId, { status: "SENT", payerViewUrl: url });
      await Clipboard.copy(url);
      await showHUD(`Sent to ${invoice.recipientEmail} — link copied ✓`);
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
    }
  }

  async function handleDelete(invoice: InvoiceRecord) {
    const confirmed = await confirmAlert({
      title: "Remove from list?",
      message: `This removes the invoice for ${invoice.recipientName} from your local list. The invoice still exists in PayPal.`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await deleteInvoice(invoice.invoiceId);
    setInvoices((prev) => prev.filter((i) => i.invoiceId !== invoice.invoiceId));
  }

  const sorted = sortInvoices(invoices, prefs.sortBy, prefs.order);
  const grouped =
    prefs.groupBy === "status"
      ? STATUS_ORDER.reduce<Record<string, InvoiceRecord[]>>((acc, status) => {
          const group = sorted.filter((i) => i.status === status);
          if (group.length > 0) acc[status] = group;
          return acc;
        }, {})
      : groupInvoices(sorted, prefs.groupBy);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search invoices…">
      {Object.entries(grouped).map(([groupKey, records]) => (
        <List.Section key={groupKey} title={groupKey} subtitle={`${records.length}`}>
          {records.map((invoice) => (
            <List.Item
              key={invoice.invoiceId}
              icon={{
                source: STATUS_ICON[invoice.status],
                tintColor: STATUS_COLOR[invoice.status],
              }}
              title={invoice.recipientName}
              subtitle={invoice.recipientEmail ?? "No email"}
              accessories={[
                { text: formatAmount(invoice.currency, invoice.total) },
                ...(invoice.dueDate
                  ? [{ text: `Due ${formatDate(invoice.dueDate)}`, icon: Icon.Calendar }]
                  : [{ text: formatDate(invoice.createdAt), icon: Icon.Calendar }]),
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Invoice">
                    <Action title="Copy Invoice Link" icon={Icon.Link} onAction={() => handleCopyLink(invoice)} />
                    {invoice.recipientEmail && isValidEmail(invoice.recipientEmail) && (
                      <Action
                        title={`Send to ${invoice.recipientEmail}`}
                        icon={Icon.Envelope}
                        onAction={() => handleSend(invoice)}
                      />
                    )}
                    <Action
                      title="Review in Browser"
                      icon={Icon.Eye}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "return" },
                        Windows: { modifiers: ["ctrl"], key: "return" },
                      }}
                      onAction={() => open(invoice.invoicerViewUrl)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Edit">
                    <Action.Push
                      title="Edit Invoice"
                      icon={Icon.Pencil}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "e" },
                        Windows: { modifiers: ["ctrl"], key: "e" },
                      }}
                      target={
                        <EditInvoiceForm
                          invoice={invoice}
                          onUpdate={(changes) => updateLocalInvoice(invoice.invoiceId, changes)}
                        />
                      }
                    />
                    <Action.Push
                      title="Set Due Date"
                      icon={Icon.Calendar}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "d" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "d" },
                      }}
                      target={
                        <SetDueDateForm
                          invoice={invoice}
                          onUpdate={(changes) => updateLocalInvoice(invoice.invoiceId, changes)}
                        />
                      }
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="View">
                    <Action.Push
                      title="Group By…"
                      icon={Icon.AppWindowGrid3x3}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "g" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "g" },
                      }}
                      target={
                        <PickerForm
                          title="Group By"
                          current={prefs.groupBy}
                          options={[
                            { value: "status", label: "Status", icon: Icon.Circle },
                            { value: "recipient", label: "Recipient", icon: Icon.Person },
                            { value: "currency", label: "Currency", icon: Icon.Coins },
                            { value: "month", label: "Month", icon: Icon.Calendar },
                          ]}
                          onSelect={(v) => updatePrefs({ groupBy: v })}
                        />
                      }
                    />
                    <Action.Push
                      title="Sort By…"
                      icon={Icon.BulletPoints}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "s" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "s" },
                      }}
                      target={
                        <PickerForm
                          title="Sort By"
                          current={prefs.sortBy}
                          options={[
                            { value: "createdAt", label: "Creation Date", icon: Icon.Clock },
                            { value: "amount", label: "Amount", icon: Icon.Coins },
                            { value: "recipient", label: "Recipient Name", icon: Icon.Person },
                          ]}
                          onSelect={(v) => updatePrefs({ sortBy: v })}
                        />
                      }
                    />
                    <Action.Push
                      title="Order By…"
                      icon={Icon.ArrowDown}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "o" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "o" },
                      }}
                      target={
                        <PickerForm
                          title="Order"
                          current={prefs.order}
                          options={[
                            { value: "desc", label: "Descending", icon: Icon.ArrowDown },
                            { value: "asc", label: "Ascending", icon: Icon.ArrowUp },
                          ]}
                          onSelect={(v) => updatePrefs({ order: v })}
                        />
                      }
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action
                      title="Refresh Status"
                      icon={Icon.ArrowClockwise}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "r" },
                        Windows: { modifiers: ["ctrl"], key: "r" },
                      }}
                      onAction={() => setRefreshKey((k) => k + 1)}
                    />
                    <Action
                      title="Remove from List"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "backspace" },
                        Windows: { modifiers: ["ctrl"], key: "delete" },
                      }}
                      onAction={() => handleDelete(invoice)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {!isLoading && invoices.length === 0 && (
        <List.EmptyView
          icon={Icon.Document}
          title="No invoices yet"
          description="Create your first invoice with the Create Invoice command."
        />
      )}
    </List>
  );
}
