import { Form } from "@raycast/api";

/**
 * The date control every command shares.
 *
 * One picker, nothing else. It replaced a Heute / Gestern / Anderes Datum
 * dropdown that revealed a *second* control once you chose the third option:
 * the shortcut saved a keystroke on the two common answers and cost an extra
 * decision plus an extra field on every other one, which is the wrong trade in
 * a form with two fields in it.
 *
 * Raycast's date picker accepts a typed date as well as a calendar click, so
 * "some day last week" is now the same interaction as today - which is what
 * the dropdown was working around in the first place.
 *
 * Callers default it to today, because every command here records something
 * that has already happened and usually just did.
 */
export function DateField({
  id,
  title,
  info,
  value,
  error,
  onChange,
}: {
  id: string;
  title: string;
  info?: string;
  value: Date | null;
  error?: string;
  onChange: (date: Date | null) => void;
}) {
  return (
    <Form.DatePicker
      id={id}
      title={title}
      {...(info ? { info } : {})}
      type={Form.DatePicker.Type.Date}
      value={value}
      error={error}
      onChange={onChange}
    />
  );
}
