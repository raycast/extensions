# Zendesk extension

Search through any [Zendesk](https://www.zendesk.com/) support center.

## Extension configuration

The extension requires two items:
1. The Zendesk base URL

- The base URL for your Zendesk support center.
- When viewing your support articles online, the URL will be in the format https://support.mycompany.com/hc/en-us/articles/3600000000000-My-Article-Title. The base URL is everything after the https:// and before the /hc/ part of the URL.

2. A locale (optional)

- When viewing your support articles online, the URL will be in the format https://support.mycompany.com/hc/en-us/articles/3600000000000-My-Article-Title. The locale is the part after the /hc/ and before the /articles part of the URL.
- If you do not specify a locale, the extension will default to en-us.


## Planned improvements
- [ ] Add filter by support section (currently only searches all articles).
- [ ] Add support for multiple locales.
- [ ] Add support for multiple Zendesk support center.
- [ ] Add search for HTML string option.