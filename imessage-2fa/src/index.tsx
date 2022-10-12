import { List, environment, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { homedir } from "os";
import initSqlJs from "sql.js";
import path from "path";
import { readFileSync } from "fs";

interface Message {
  id: string;
  code: string;
  message_date: string;
  sender: string;
  message: string;
}
interface State {
  items?: Message[];
  error?: Error;
}

const DB_PATH = homedir() + "/Library/Messages/chat.db";
const lookBackMinutes = 60 * 24;
const sql = `select
  message.rowid,
  ifnull(handle.uncanonicalized_id, chat.chat_identifier) AS sender,
  message.service,
  datetime(message.date / 1000000000 + 978307200, 'unixepoch', 'localtime') AS message_date,
  message.text
from message
  left join chat_message_join on chat_message_join.message_id = message.ROWID
  left join chat on chat.ROWID = chat_message_join.chat_id
  left join handle on message.handle_id = handle.ROWID
where
  message.is_from_me = 0
  and message.text is not null
  and length(message.text) > 0
  and (
      message.text glob '*[0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9][0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9]-[0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'
  )
  and datetime(message.date / 1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime')
          >= datetime('now', '-${lookBackMinutes} minutes', 'localtime')
order by
    message.date desc
limit 100
`;

/**
 * try to extract iMessage 2FA Code, empty result if not found any code
 *
 * @param original - original message text from iMessage
 * @returns
 * @see https://github.com/squatto/alfred-imessage-2fa/blob/master/find-messages.php
 */
const extractCode = (original: string) => {
  // remove URLs
  const regex = new RegExp(
    "\\b((https?|ftp|file):\\/\\/|www\\.)[-A-Z0-9+&@#\\/%?=~_|$!:,.;]*[A-Z0-9+&@#\\/%=~_|$]",
    "ig"
  );
  const message = original.replaceAll(regex, "");

  if (message.trim() === "") return "";

  let m;
  let code;

  if ((m = /(^|\s|\\R|\t|\b|G-|:)(\d{5,8})($|\s|\\R|\t|\b|\.|,)/.exec(message)) !== null) {
    code = m[2];
    // 5-8 consecutive digits
    // examples:
    //   "您的验证码是 199035，10分钟内有效，请勿泄露"
    //   "登录验证码：627823，您正在尝试【登录】，10分钟内有效"
    //   "【赛验】验证码 54538"
    //   "Enter this code to log in:59678."
    //   "G-315643 is your Google verification code"
    //   "Enter the code 765432, and then click the button to log in."
    //   "Your code is 45678!"
    //   "Your code is:98765!"
  } else if ((m = /^(\d{4,8})(\sis your.*code)/.exec(message)) !== null) {
    // 4-8 digits followed by "is your [...] code"
    // examples:
    //   "2773 is your Microsoft account verification code"
    code = m[1];
  } else if ((m = /(code:|is:)\s*(\d{4,8})($|\s|\\R|\t|\b|\.|,)/i.exec(message)) !== null) {
    // "code:" OR "is:", optional whitespace, then 4-8 consecutive digits
    // examples:
    //   "Your Airbnb verification code is: 1234."
    //   "Your verification code is: 1234, use it to log in"
    //   "Here is your authorization code:9384"
    code = m[2];
  } else if ((m = /(code|is):?\s*(\d{3,8})($|\s|\\R|\t|\b|\.|,)/i.exec(message)) !== null) {
    // "code" OR "is" followed by an optional ":" + optional whitespace, then 3-8 consecutive digits
    // examples:
    //   "Please enter code 548 on Zocdoc."
    code = m[2];
  } else if ((m = /(^|code:|is:|\b)\s*(\d{3})-(\d{3})($|\s|\\R|\t|\b|\.|,)/.exec(message)) !== null) {
    // line beginning OR "code:" OR "is:" OR word boundary, optional whitespace, 3 consecutive digits, a hyphen, then 3 consecutive digits
    // but NOT a phone number (###-###-####)
    // examples:
    //   "123-456"
    //   "Your Stripe verification code is: 719-839."
    // and make sure it isn't a phone number
    // doesn't match: <first digits>-<second digits>-<4 consecutive digits>

    const first = m[2];
    const second = m[3];
    if (!new RegExp("/(^|code:|is:|\b)s*" + first + "-" + second + "-(d{4})($|s|R|\t|\b|.|,)/").test(message)) {
      return `${first}${second}`;
    }
    return "";
  }

  return code;
};

const fetchMessages = async (setState: React.Dispatch<React.SetStateAction<State>>) => {
  try {
    const SQL = await initSqlJs({ locateFile: () => path.join(environment.assetsPath, "sql-wasm.wasm") });
    const db = readFileSync(DB_PATH);
    const database = new SQL.Database(db);
    const statement = database.prepare(sql);

    const results: Message[] = [];
    while (statement.step()) {
      const row = statement.getAsObject();
      const code = extractCode(row.text as string);
      if (code) {
        results.push({
          id: row.ROWID as string,
          code,
          message: row.text as string,
          sender: row.sender as string,
          message_date: row.message_date as string,
        });
      }
    }

    statement.free();

    setState({ items: results });
  } catch (error) {
    console.log("error", error);
    setState({
      error: error instanceof Error ? error : new Error("Something went wrong"),
    });
  }
};

const rowWithCopyToClipboard = (item: string) => {
  return (
    <List.Item
      key={item}
      title={item}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={item} shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    ></List.Item>
  );
};

export default function Command() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    fetchMessages(setState);
  }, []);

  return (
    <List isLoading={!state.items && !state.error}>
      {state.items
        ?.filter((item) => !!item.code)
        .map((item) => (
          <List.Item
            key={item.id}
            icon="list-icon.png"
            title={item.code ?? "No title"}
            subtitle={item.message}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  target={
                    <List>
                      {[`${item.code}`, `${item.message}`, `${item.code}\t${item.message}`].map((x) =>
                        rowWithCopyToClipboard(x)
                      )}
                    </List>
                  }
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
