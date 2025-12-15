# @zeropath/backstage-plugin-zeropath

A Backstage frontend plugin that displays ZeroPath security issues for your catalog entities.

## Features

- **Security Card** - Overview widget showing issue counts by severity
- **Security Tab** - Full issues list with filtering and details
- **Entity Matching** - Automatically matches entities to ZeroPath repositories via annotations

## Installation

```bash
# yarn
yarn add @zeropath/backstage-plugin-zeropath

# npm
npm install @zeropath/backstage-plugin-zeropath
```

## Configuration

### 1. Configure the proxy

Add the ZeroPath proxy to your `app-config.yaml`:

```yaml
proxy:
  endpoints:
    '/zeropath':
      target: 'https://zeropath.com'
      headers:
        X-ZeroPath-API-Token-Id: ${ZEROPATH_TOKEN_ID}
        X-ZeroPath-API-Token-Secret: ${ZEROPATH_TOKEN_SECRET}
      changeOrigin: true
      allowedMethods: ['GET', 'POST']
```

### 2. Configure the plugin

Add ZeroPath configuration to your `app-config.yaml`:

```yaml
zeropath:
  organizationId: ${ZEROPATH_ORG_ID}
  # Optional: customize the annotation key (default: github.com/project-slug)
  repositoryAnnotation: github.com/project-slug
```

### 3. Add annotation to your entities

Add the repository annotation to your catalog entities:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  annotations:
    github.com/project-slug: my-org/my-repo
spec:
  type: service
  owner: team-a
  lifecycle: production
```

## Usage

### Add to Entity Page

In your `packages/app/src/components/catalog/EntityPage.tsx`:

```tsx
import {
  ZeroPathSecurityCard,
  ZeroPathSecurityContent,
  isZeroPathAvailable,
} from '@zeropath/backstage-plugin-zeropath';

// Add the card to overview
const overviewContent = (
  <Grid container spacing={3}>
    {/* ... other cards ... */}
    <EntitySwitch>
      <EntitySwitch.Case if={isZeroPathAvailable}>
        <Grid item md={6}>
          <ZeroPathSecurityCard />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>
  </Grid>
);

// Add the tab to entity page
const serviceEntityPage = (
  <EntityLayout>
    {/* ... other tabs ... */}
    <EntityLayout.Route path="/security" title="Security">
      <ZeroPathSecurityContent />
    </EntityLayout.Route>
  </EntityLayout>
);
```

## Components

### ZeroPathSecurityCard

A compact card showing issue counts by severity (critical, high, medium, low).

```tsx
import { ZeroPathSecurityCard } from '@zeropath/backstage-plugin-zeropath';

<ZeroPathSecurityCard />
```

### ZeroPathSecurityContent

A full-page tab with issue table, filtering, and detail panel.

```tsx
import { ZeroPathSecurityContent } from '@zeropath/backstage-plugin-zeropath';

<ZeroPathSecurityContent />
```

### isZeroPathAvailable

Condition function for EntitySwitch to conditionally render components.

```tsx
import { isZeroPathAvailable } from '@zeropath/backstage-plugin-zeropath';

<EntitySwitch>
  <EntitySwitch.Case if={isZeroPathAvailable}>
    <ZeroPathSecurityCard />
  </EntitySwitch.Case>
</EntitySwitch>
```

## Severity Mapping

ZeroPath scores are mapped to severity levels:

| Severity | Score Range |
|----------|-------------|
| Critical | 90-100 |
| High | 70-89 |
| Medium | 40-69 |
| Low | 10-39 |

## Related Packages

- `@zeropath/backstage-plugin-zeropath-common` - Shared types and utilities
- `@zeropath/backstage-soundcheck` - Soundcheck collector for policy checks

## License

Apache-2.0
