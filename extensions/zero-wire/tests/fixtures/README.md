# Source fixtures

`zero-wire-rss.xml` is the public RSS response retrieved on 5 November 2026 in Asia/Kolkata from https://radar.cloudflare.com/security/zero-wire/rss. It contains six source briefings and two source assessment prompts. Cloudflare owns the source content. It is test input and is not bundled into extension commands or used as an offline seed.

The RSS fixture is an unmodified capture. We treat it as direct-download data under [Radar's licensing policy](https://radar.cloudflare.com/about#licensing-policies), [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) for noncommercial reuse. This is an interpretation of the general policy; see the source terms findings in the project README. The code's MIT license does not relicense this fixture. Cloudflare does not endorse the extension.

`briefings.json` contains invented test data for edge cases, not actual security advice. `helpers.ts` wraps it in RSS with unknown categories, missing dates, Unicode prompts, and unsafe links. This synthetic data is never shown as live content.
