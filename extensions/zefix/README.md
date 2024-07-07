# Zefix

A Raycast extension that looks up companies in the Swiss national trade register.

## Zefix API

Currently, this extension uses the publicly undocumented `v1`-API,
which their official website uses as well.
This way, no API token is necessary.

## Improvement Ideas

- [ ] Use the `https://zefix.ch/ZefixREST/api/v1/firm/[ID]/withoutShabPub.json` API to get more information about a
  company and show it in the details panel, for example the company's _purpose_ text.
- [ ] Use the `https://zefix.ch/ZefixREST/api/v1/firm/[ID]/shabPub.json` API to load the latest SHAB entries about a
  company and show them in the details panel.
- [ ] Implement pagination for results
- [ ] Improve Icon
