export interface Language {
  locale: string;
  text: string;
}

export interface Documentation {
  [locale: string]: {
    [section: string]: {
      [topic: string]: string;
    };
  };
}
