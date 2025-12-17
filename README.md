# ZeroPath Backstage Plugin

Surface security vulnerabilities directly in your Backstage developer portal. Developers see issues where they work—no context switching.

## What It Does

- **Security Tab** on every component showing ZeroPath scan results
- **Summary Cards** with severity breakdown (Critical, High, Medium, Low)
- **Issue Details** with code snippets, file locations, and CWE references
- **Soundcheck Integration** for automated compliance tracking

## Quick Start (Demo)

```bash
# 1. Clone the repo
git clone https://github.com/ZeroPathAI/backstage-soundcheck.git
cd backstage-soundcheck/example-app

# 2. Copy environment template and fill in credentials
cp .env.example .env
# Edit .env with your ZeroPath API credentials

# 3. Install and run
yarn install
source .env && NODE_OPTIONS="--no-node-snapshot" yarn start
```

Open http://localhost:3000 — components auto-populate from ZeroPath repositories.

**Note**: The server can take up to 30 seconds to start—expect a blank screen initially while the backend initializes.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ZEROPATH_BASE_URL` | ZeroPath API URL (default: `https://zeropath.com`) | Yes |
| `ZEROPATH_ORGANIZATION_ID` | Your ZeroPath org ID | Yes |
| `ZEROPATH_TOKEN_ID` | API token ID | Yes |
| `ZEROPATH_TOKEN_SECRET` | API token secret | Yes |
| `SPOTIFY_SOUNDCHECK_LICENSE_KEY` | Soundcheck license (for compliance features) | Optional |
| `GITHUB_TOKEN` | GitHub PAT (for repo links) | Optional |

## How Entities Are Linked

The plugin matches Backstage components to ZeroPath repositories via the `github.com/project-slug` annotation:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  annotations:
    github.com/project-slug: my-org/my-repo  # Must match ZeroPath repo
spec:
  type: service
  owner: team-platform
```

**Auto-Discovery**: The demo includes a ZeroPath Entity Provider that automatically creates Component entities for all repositories in your ZeroPath organization—no manual YAML needed.

## Configuration Reference

### app-config.local.yaml

```yaml
# ZeroPath API proxy (frontend)
proxy:
  endpoints:
    '/zeropath':
      target: ${ZEROPATH_BASE_URL}
      headers:
        X-ZeroPath-API-Token-Id: ${ZEROPATH_TOKEN_ID}
        X-ZeroPath-API-Token-Secret: ${ZEROPATH_TOKEN_SECRET}
      changeOrigin: true
      allowedMethods: ['GET', 'POST']

# ZeroPath plugin config
zeropath:
  baseUrl: ${ZEROPATH_BASE_URL}
  organizationId: ${ZEROPATH_ORGANIZATION_ID}
  tokenId: ${ZEROPATH_TOKEN_ID}
  tokenSecret: ${ZEROPATH_TOKEN_SECRET}
  defaultOwner: group:default/team-platform
  defaultSystem: demo-system

# Soundcheck collector (optional - for compliance)
soundcheck:
  license: ${SPOTIFY_SOUNDCHECK_LICENSE_KEY}
  collectors:
    zeropath:
      baseUrl: ${ZEROPATH_BASE_URL}
      organizationId: ${ZEROPATH_ORGANIZATION_ID}
      tokenId: ${ZEROPATH_TOKEN_ID}
      tokenSecret: ${ZEROPATH_TOKEN_SECRET}
```

## Severity Mapping

| Severity | Score Range | Color |
|----------|-------------|-------|
| Critical | 90-100 | Red |
| High | 70-89 | Orange |
| Medium | 40-69 | Yellow |
| Low | 10-39 | Blue |

## Soundcheck Compliance (Optional)

The plugin includes pre-configured Soundcheck checks:

| Check | Description |
|-------|-------------|
| `zeropath-linked` | Component has a linked ZeroPath repository |
| `zeropath-pr-scanning` | PR scanning is enabled |
| `zeropath-critical-zero` | No critical vulnerabilities |
| `zeropath-high-zero` | No high severity vulnerabilities |

These roll up into the **ZeroPath Security Posture** program with two levels:
1. **Connected** - Entity linked to ZeroPath
2. **Healthy Posture** - PR scanning on, no critical/high issues

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      BACKSTAGE                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Catalog    │  │   ZeroPath   │  │  Soundcheck  │  │
│  │              │──│   Frontend   │──│  (Compliance)│  │
│  │              │  │    Plugin    │  │              │  │
│  └──────────────┘  └──────┬───────┘  └──────┬───────┘  │
└───────────────────────────┼─────────────────┼──────────┘
                            │                 │
                            ▼                 ▼
                    ┌───────────────┐  ┌─────────────────┐
                    │   Backstage   │  │    ZeroPath     │
                    │     Proxy     │  │   Soundcheck    │
                    │  /zeropath/*  │  │    Collector    │
                    └───────┬───────┘  └────────┬────────┘
                            └──────────┬────────┘
                                       ▼
                            ┌─────────────────────┐
                            │    ZeroPath API     │
                            └─────────────────────┘
```

**Plugins in `example-app/plugins/`:**

| Plugin | Purpose |
|--------|---------|
| `plugin-zeropath` | Frontend UI components |
| `plugin-zeropath-backend` | Entity provider (auto-discovery) |
| `plugin-zeropath-common` | Shared types & severity logic |
| `backstage-soundcheck` | Soundcheck fact collector |

## Requirements

- Node.js 20+
- Backstage 1.45+ (tested with new frontend system)
- ZeroPath account with API credentials

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/repositories/list` | List repos in organization |
| `POST /api/v1/issues/search` | Search issues with filters |
| `POST /api/v1/issues/get` | Get issue details |

See [ZeroPath API Reference](https://zeropath.com/docs/api-reference/introduction) for full documentation.

## License

Apache-2.0
