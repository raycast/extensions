# Contributing

## Development Standards

- Use TypeScript with strict mode and avoid `any` in core paths.
- Keep command UIs thin; business logic belongs in `src/core`.
- Route Zo API calls through shared clients.
- Run checks before opening a PR:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run format`

## Pull Request Expectations

- Keep changes scoped and include tests for logic-heavy updates.
- Document behavior changes in `README.md` and `EXECUTION_PLAN.md` when relevant.
