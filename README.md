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
      baseUrl: https://tenant.zeropath.com
      organizationId: org_123456789
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

## Development

This package requires the Backstage CLI and relies on the Soundcheck backend
from Spotify. Run `yarn backstage-cli package build` to produce distributable
artifacts once dependencies are available.
