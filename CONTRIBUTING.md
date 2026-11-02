# Contributing

## Branching

- `main`: production-ready baseline
- `Tyrax0/<short-task>`: default feature branch prefix for this workspace
- `feature/<short-task>` or `fix/<short-task>`: acceptable when coordinating with outside contributors

## Definition of Done

A task is complete only when:

1. Code is implemented.
2. Permissions and privacy are considered.
3. Tests or meaningful checks are run.
4. Documentation is updated when behavior changes.
5. Local URLs or verification steps are provided.

## Pull Requests

Each PR should include:

- Summary
- Screenshots for UI changes
- Test plan
- Migration notes if applicable
- Security and privacy considerations
- Known limitations

## Local Checks

```bash
npm run lint:web
npm run typecheck:web
npm run build:web
npm run lint:api
npm run test:api
```

