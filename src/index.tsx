import { Action, ActionPanel, Form, Icon, showHUD } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { Clipboard } from "@raycast/api";
import { useState } from "react";

interface TransliterationFormValues {
  latinInput: string;
  cyrillicOutput: string;
}

const MAX_MUNCH_LENGTH = 3;
const MAX_HUD_PREVIEW_LENGTH = 50;
const DEFAULT_PLACEHOLDER = "Privet...";
const DEFAULT_OUTPUT = "Привет...";

const PHONETIC_MAP: Record<string, string[]> = {
  а: ["a"],
  б: ["b"],
  в: ["v"],
  г: ["g"],
  д: ["d"],
  е: ["e"],
  ё: ["yo", "jo", "ö"],
  ж: ["zh"],
  з: ["z"],
  и: ["i"],
  й: ["j"],
  к: ["k"],
  л: ["l"],
  м: ["m"],
  н: ["n"],
  о: ["o"],
  п: ["p"],
  р: ["r"],
  с: ["s"],
  т: ["t"],
  у: ["u"],
  ф: ["f"],
  х: ["h", "x"],
  ц: ["c"],
  ч: ["ch"],
  ш: ["sh"],
  щ: ["shh", "w"],
  ъ: ["#", "tvz"],
  Ъ: ["##"],
  ы: ["y"],
  ь: ["'", "mjz"],
  Ь: ["''"],
  э: ["je", "ä"],
  ю: ["yu", "ju", "ü"],
  я: ["ya", "ja", "q"],
};

// Create reverse mapping for Latin to Cyrillic conversion
const REVERSE_PHONETIC_MAP = Object.entries(PHONETIC_MAP).reduce<Record<string, string>>(
  (acc, [cyrillic, latinVariants]) => {
    latinVariants.forEach((latin) => {
      acc[latin] = cyrillic;
    });
    return acc;
  },
  {},
);

/**
 * Checks if a character is a letter
 * @param char - Single character to check
 * @returns boolean indicating if the character is a letter
 */
function isLetter(char: string): boolean {
  return char.toLowerCase() !== char.toUpperCase();
}

/**
 * Converts Latin text to Cyrillic using phonetic transliteration
 * @param input - Latin text to convert
 * @returns Transliterated Cyrillic text
 */
function transliterateLatinToCyrillic(input: string): string {
  let result = "";
  let i = 0;

  while (i < input.length) {
    let currentLength = MAX_MUNCH_LENGTH;
    let matched = false;

    // Try to match longest possible sequence first
    while (currentLength >= 1) {
      const sequence = input.slice(i, i + currentLength);
      const cyrillicChar = REVERSE_PHONETIC_MAP[sequence.toLowerCase()];

      if (cyrillicChar) {
        const shouldUppercase = isLetter(sequence[0]) && sequence[0] === sequence[0].toUpperCase();
        result += shouldUppercase ? cyrillicChar.toUpperCase() : cyrillicChar;
        i += currentLength;
        matched = true;
        break;
      }
      currentLength--;
    }

    // If no match found, keep the original character
    if (!matched) {
      result += input[i];
      i++;
    }
  }

  return result;
}

/**
 * Creates a preview text for the HUD notification
 * @param text - Text to create preview from
 * @returns Truncated text with ellipsis if necessary
 */
function createHUDPreview(text: string): string {
  return text.length <= MAX_HUD_PREVIEW_LENGTH ? text : `${text.slice(0, MAX_HUD_PREVIEW_LENGTH)}...`;
}

export default function Command() {
  const [input, setInput] = useState("");
  const [cyrillicOutput, setCyrillicOutput] = useState("");

  const { handleSubmit } = useForm<TransliterationFormValues>({
    async onSubmit() {
      await Clipboard.copy(cyrillicOutput);
      await showHUD(`${createHUDPreview(cyrillicOutput)} copied!`);
      setInput("");
      setCyrillicOutput("");
    },
  });

  const handleInputChange = (value: string) => {
    setInput(value);
    setCyrillicOutput(transliterateLatinToCyrillic(value));
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy to Clipboard" icon={Icon.Clipboard} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Latin Input"
        placeholder={DEFAULT_PLACEHOLDER}
        value={input}
        onChange={handleInputChange}
      />
      <Form.Description title="Cyrillic Output" text={cyrillicOutput || DEFAULT_OUTPUT} />
    </Form>
  );
}
