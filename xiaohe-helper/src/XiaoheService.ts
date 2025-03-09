const consonants: Record<string, string> = {
  b: "b",
  p: "p",
  m: "m",
  f: "f",
  d: "d",
  t: "t",
  n: "n",
  l: "l",
  g: "g",
  k: "k",
  h: "h",
  j: "j",
  q: "q",
  x: "x",
  zh: "v",
  ch: "i",
  sh: "u",
  r: "r",
  z: "z",
  c: "c",
  s: "s",
  y: "y",
  w: "w",
};

const vowels: Record<string, string> = {
  iu: "q",
  ei: "w",
  e: "e",
  uan: "r",
  ue: "t",
  un: "y",
  u: "u",
  i: "i",
  uo: "o",
  o: "o",
  ie: "p",
  a: "a",
  iong: "s",
  ong: "s",
  ai: "d",
  en: "f",
  eng: "g",
  ang: "h",
  an: "j",
  ing: "k",
  uai: "k",
  iang: "l",
  uang: "l",
  ou: "z",
  ia: "x",
  ua: "x",
  ao: "c",
  v: "v",
  ui: "v",
  in: "b",
  iao: "n",
  ian: "m",
};

export default class XiaoheService {
  static convert(pinyin: string): string {
    return pinyin
      .toLowerCase()
      .split(" ")
      .map((character: string | undefined) => {
        if (character) {
          const match = character.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcswy]?)(.*)$/);
          if (!match) return character;
          const [, consonant, vowel] = match;
          const consonantKey = consonant in consonants ? consonants[consonant] : "?";
          const vowelKey = vowel in vowels ? vowels[vowel] : "?";
          return consonantKey + vowelKey;
        }
        return "";
      })
      .join(" ");
  }

  static splitKeys(xiaohe: string): string[] {
    if (!xiaohe?.trim()) {
      return [];
    }

    return xiaohe
      .toLowerCase()
      .split(/\s+/)
      .join("")
      .split("")
      .filter((char) => /[a-z]/.test(char));
  }
}
