# ZeroPath Backstage Plugins

Integrate [ZeroPath](https://zeropath.com) security scanning into your Backstage developer portal.

## Packages

| Package | Description |
|---------|-------------|
| [`@zeropath/backstage-plugin-zeropath`](./packages/plugin-zeropath/) | Frontend UI - security cards & issue tables |
| [`@zeropath/backstage-plugin-zeropath-common`](./packages/plugin-zeropath-common/) | Shared types & utilities |
| [`@zeropath/backstage-soundcheck`](./packages/backstage-soundcheck/) | Soundcheck fact collector for compliance |

## Quick Start

### Prerequisites

- Backstage app (v1.20+)
- ZeroPath account with API credentials
- Node.js 20+

### 1. Install

```bash
# Frontend plugin
yarn add @zeropath/backstage-plugin-zeropath

# Optional: Soundcheck collector
yarn add @zeropath/backstage-soundcheck @spotify/backstage-plugin-soundcheck-backend
```

### 2. Configure `app-config.yaml`

```yaml
proxy:
  endpoints:
    '/zeropath':
      target: 'https://zeropath.com'
      headers:
        X-ZeroPath-API-Token-Id: ${ZEROPATH_TOKEN_ID}
        X-ZeroPath-API-Token-Secret: ${ZEROPATH_TOKEN_SECRET}

zeropath:
  organizationId: ${ZEROPATH_ORGANIZATION_ID}

# Optional: Soundcheck config
soundcheck:
  collectors:
    zeropath:
      baseUrl: https://zeropath.com
      organizationId: ${ZEROPATH_ORGANIZATION_ID}
      tokenId: ${ZEROPATH_TOKEN_ID}
      tokenSecret: ${ZEROPATH_TOKEN_SECRET}
```

### 3. Add to Entity Pages

```tsx
// packages/app/src/components/catalog/EntityPage.tsx
import {
  ZeroPathSecurityCard,
  ZeroPathSecurityContent,
} from '@zeropath/backstage-plugin-zeropath';

// Overview tab - add security summary card
<Grid item md={6}>
  <ZeroPathSecurityCard />
</Grid>

// New Security tab - full issue table
<EntityLayout.Route path="/security" title="Security">
  <ZeroPathSecurityContent />
</EntityLayout.Route>
```

### 4. Register Soundcheck (Optional)

```ts
// packages/backend/src/index.ts
backend.add(import('@spotify/backstage-plugin-soundcheck-backend'));
backend.add(import('@zeropath/backstage-soundcheck'));
```

### 5. Annotate Your Entities

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  annotations:
    github.com/project-slug: my-org/my-repo  # Must match ZeroPath repo
```

## Running the Example App

```bash
# Clone and install
git clone https://github.com/ZeroPathAI/backstage-soundcheck.git
cd backstage-soundcheck

# Set environment variables
export ZEROPATH_TOKEN_ID=your-token-id
export ZEROPATH_TOKEN_SECRET=your-token-secret
export ZEROPATH_ORGANIZATION_ID=your-org-id

# Install and run
yarn install
cd example-app
yarn install
NODE_OPTIONS="--no-node-snapshot" yarn start
```

Open http://localhost:3000 and navigate to any component with a `github.com/project-slug` annotation.

## Severity Mapping

| Severity | Score Range | Color |
|----------|-------------|-------|
| Critical | 90-100 | Red |
| High | 70-89 | Orange |
| Medium | 40-69 | Yellow |
| Low | 10-39 | Blue |

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/repositories/list` | List repositories in organization |
| `POST /api/v1/issues/search` | Search issues with filters & pagination |
| `POST /api/v1/issues/get` | Get single issue details |

See [ZeroPath API Reference](https://zeropath.com/docs/api-reference/introduction) for full documentation.

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed architecture and data flow diagrams.

## License

Apache-2.0
