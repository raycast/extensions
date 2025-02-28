// Type definitions for the search documentation
export interface Language {
  locale: string;
  name: string;
}

export interface Documentation {
  [locale: string]: {
    [section: string]: {
      [topic: string]: string;
    };
  };
}
