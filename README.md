# Zeropath Soundcheck Backend Module

This package provides a Zeropath fact collector for the Backstage Soundcheck
backend plugin. It enables Soundcheck to query Zeropath repositories for issue
counts, PR scanning status, and security posture metrics.

## Installation

Publish the package or link it into your Backstage instance, then add it as a
dependency of your backend:

```sh
yarn workspace backend add @zeropath/backstage-soundcheck
```

Register the module in `packages/backend/src/index.ts` (or the relevant
registration file):

```ts
backend.add(import('@zeropath/backstage-soundcheck'));
```

## Configuration

Provide credentials and collector scheduling via `app-config.yaml`:

```yaml
soundcheck:
  collectors:
    zeropath:
      baseUrl: https://zeropath.com
      organizationId: ${ZEROPATH_ORGANIZATION_ID}
      tokenId: ${ZEROPATH_TOKEN_ID}
      tokenSecret: ${ZEROPATH_TOKEN_SECRET}
      repositorySlugAnnotation: github.com/project-slug
      repositorySlugPrefix: my-org
      collects:
        - frequency:
            cron: '0 * * * *'
```

All sensitive values should be supplied via environment variables or an
external secrets store.

### Quick start with the bundled example

If you want a ready-to-use setup that automatically enrolls every component in
Soundcheck, copy the contents of
[`examples/zeropath-soundcheck.yaml`](./examples/zeropath-soundcheck.yaml) into
your Backstage configuration. It contains:

- A collector schedule that targets all `Component` entities (no opt-in work).
- Guarded checks that show a "repository not linked" message instead of
  failing whenever the `github.com/project-slug` annotation is missing.
- A `zeropath-security-posture` track that surfaces the linked/pr-scanning and
  severity checks in the Soundcheck UI.

After pasting the example config, restart the backend (or run the
`soundcheck-refresh-applicable-entities` job) so the widened filters take
effect.

### Demo checklist / suggested flow

When recording a walkthrough for customers, we recommend covering the
following:

1. **Prerequisites** – point out the required Zeropath env vars and
   `repositorySlugAnnotation`, and verify that catalog entities contain the
   matching `github.com/project-slug` annotation.
2. **Collector wiring** – show how the backend module is registered and how the
   `collects` schedule automatically covers every component.
3. **Soundcheck configuration** – walk through the example track definition so
   users see how checks map to the Zeropath facts.
4. **Live demo** – in Backstage, open:
   - The Soundcheck sidebar overview to highlight the new "Zeropath Security
     Posture" track.
   - An entity that passes all checks.
   - An entity without a Zeropath repo to show the "not linked" message.
5. **Investigating results** – click "View details" on a check to show the raw
   facts and explain how customers can tweak thresholds/messages.

Including this flow in your video makes it clear how to get started and how to
interpret the Zeropath data inside Soundcheck.

## Development

This package requires the Backstage CLI and relies on the Soundcheck backend
from Spotify. Run `yarn backstage-cli package build` to produce distributable
artifacts once dependencies are available.
