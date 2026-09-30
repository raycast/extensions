import fetch, { Response } from "node-fetch";

export type ZefixEntry = {
  cantonalExcerptWeb: string;
  chid: string;
  chidFormatted: string;
  deleteDate: null;
  ehraid: number;
  legalFormId: number;
  legalSeat: string;
  legalSeatId: number;
  name: string;
  rabId: number;
  registerOfficeId: number;
  shabDate: string;
  status: string;
  uid: string;
  uidFormatted: string;
};

export type ZefixLanguage = "de" | "en" | "fr" | "it";

export type ZefixSearchInput = {
  name?: string;
  languageKey?: ZefixLanguage;
  offset?: number;
  maxEntries?: number;
};

export type ZefixSearchResult = {
  hasMoreResults: boolean;
  list: [ZefixEntry];
  maxEntries: number;
  maxOffset: number;
  offset: number;
};

export type ZefixSearchResponse = Omit<Response, "json"> & {
  json: () => ZefixSearchResult | PromiseLike<ZefixSearchResult>;
};

export type ZefixLegalForm = {
  id: number;
  name: {
    de: string;
    fr: string;
    it: string;
    en: string;
  };
  sort: number;
  kurzform: {
    de: string;
    fr: string;
    it: string;
    en: string;
  };
};

export type ZefixLegalFormResponse = Omit<Response, "json"> & {
  json: () => ZefixLegalForm[] | PromiseLike<ZefixLegalForm[]>;
};

export function zefixSearch(search: ZefixSearchInput): Promise<ZefixSearchResult> {
  return fetch("https://www.zefix.ch/ZefixREST/api/v1/firm/search.json", {
    method: "POST",
    body: JSON.stringify(search),
    headers: {
      "User-Agent": "RaycastZefixClient",
      "Content-Type": "application/json",
    },
  })
    .then((res) => res as ZefixSearchResponse)
    .then((res) => {
      if (res.status != 200) {
        throw new Error(`Unexpected HTTP response status '${res.status}'`);
      }
      return res.json();
    });
}

export function zefixLegalForms(): Promise<ZefixLegalForm[]> {
  return fetch("https://zefix.ch/ZefixREST/api/v1/legalForm.json", {
    headers: {
      "User-Agent": "RaycastZefixClient",
    },
  })
    .then((res) => res as ZefixLegalFormResponse)
    .then((res) => {
      if (res.status != 200) {
        throw new Error(`Unexpected HTTP response status '${res.status}'`);
      }
      return res.json();
    });
}
