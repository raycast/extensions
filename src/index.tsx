import { Action, ActionPanel, Form, showHUD } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";

import { Clipboard } from "@raycast/api";

interface PhoneticTranslationFormValues {
  latinInput: string;
  cyrillicOutput: string;
}

const phoneticMapLowercase = {
  "а": ["a"],
  "б": ["b"],
  "в": ["v"],
  "г": ["g"],
  "д": ["d"],
  "е": ["e"],
  "ё": ["yo", "jo", "ö"],
  "ж": ["zh"],
  "з": ["z"],
  "и": ["i"],
  "й": ["j"],
  "к": ["k"],
  "л": ["l"],
  "м": ["m"],
  "н": ["n"],
  "о": ["o"],
  "п": ["p"],
  "р": ["r"],
  "с": ["s"],
  "т": ["t"],
  "у": ["u"],
  "ф": ["f"],
  "х": ["h", "x"],
  "ц": ["c"],
  "ч": ["ch"],
  "ш": ["sh"],
  "щ": ["shh", "w"],
  "ъ": ["#", "##", "tvz"],
  "ы": ["y"],
  "ь": ["'", "''", "mjz"],
  "э": ["je", "ä"],
  "ю": ["yu", "ju", "ü"],
  "я": ["ya", "ja", "q"],
};

const reversePhoneticMapLowercase = Object.entries(phoneticMapLowercase).reduce<
  Record<string, string>
>(
  (acc, [key, value]) => {
    value.forEach((v) => {
      acc[v] = key;
    });
    return acc;
  },
  {},
);

const MAXIMUM_MUNCH = 3;

const phoneticMap = (input: string) => {
  let translated = "";

  let i = 0;
  while (i < input.length) {
    let currentMunch = MAXIMUM_MUNCH;
    let matched = false;

    while (currentMunch >= 1) {
      const end = i + currentMunch;
      const sequence = input.slice(i, end);
      const found = reversePhoneticMapLowercase[sequence.toLocaleLowerCase()];

      if (found) {
        const shouldUppercase = sequence[0].toLocaleUpperCase() === sequence[0];
        translated += shouldUppercase ? found.toLocaleUpperCase() : found;
        i += currentMunch;
        matched = true;
        break;
      } else {
        currentMunch--;
      }
    }

    if (!matched) {
      translated += input[i];
      i++;
    }
  }

  return translated;
};

export default function Command() {
  const [input, setInput] = useState("");
  const [cyrillicOutput, setCyrillicOutput] = useState("");
  const { handleSubmit } = useForm<PhoneticTranslationFormValues>({
    async onSubmit() {
      await Clipboard.copy(cyrillicOutput);
      await showHUD(
        `${
          cyrillicOutput.length < 50
            ? cyrillicOutput
            : cyrillicOutput.slice(0, 50) + "..."
        } copied!`,
      );
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Copy to Clipboard"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="🔤"
        placeholder="Privet..."
        value={input}
        onChange={(value) => {
          setInput(value);

          const cyrillicOutput = phoneticMap(value);

          setCyrillicOutput(cyrillicOutput);
        }}
        id="input"
      />
      <Form.Description
        title="🇷🇺"
        text={cyrillicOutput || "Привет..."}
      />
    </Form>
  );
}
