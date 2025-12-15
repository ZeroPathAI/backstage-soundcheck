# ZeroPath Backstage Plugin Architecture

## Overview

This document explains how Backstage, Soundcheck, and ZeroPath work together to provide security visibility and compliance tracking in your developer portal.

---

## Repository Structure

```
backstage-soundcheck/
├── packages/                    # PUBLISHED NPM PACKAGES (your products)
│   ├── plugin-zeropath/         # @zeropath/backstage-plugin-zeropath
│   ├── plugin-zeropath-common/  # @zeropath/backstage-plugin-zeropath-common
│   └── backstage-soundcheck/    # @zeropath/backstage-soundcheck
│
└── example-app/                 # DEMO BACKSTAGE INSTANCE (not published)
    └── packages/
        ├── app/                 # Frontend that USES the plugins
        └── backend/             # Backend that USES the Soundcheck collector
```

### `packages/` = Publishable Plugins

These are the npm packages published for customers to install:

```bash
yarn add @zeropath/backstage-plugin-zeropath
yarn add @zeropath/backstage-soundcheck
```

### `example-app/` = Demo Backstage Instance

A complete Backstage application used for:
- **Testing** plugins during development
- **Demonstrating** how to integrate the plugins
- **Documentation** - shows customers the correct setup

Created using the Backstage CLI:

```bash
npx @backstage/create-app@latest
```

This scaffolds a complete Backstage app with:
- `packages/app/` - React frontend
- `packages/backend/` - Node.js backend
- `app-config.yaml` - Configuration
- Standard plugins (catalog, techdocs, scaffolder, etc.)

The ZeroPath plugins were then integrated by:
1. Adding dependencies to `packages/app/package.json`
2. Importing components in `EntityPage.tsx`
3. Registering the Soundcheck collector in `packages/backend/src/index.ts`
4. Configuring the proxy in `app-config.local.yaml`

### Analogy

- `packages/` = The library you're shipping (like React itself)
- `example-app/` = A demo app showing how to use your library

Customers don't install `example-app/` - they create their own Backstage app and install the packages from npm.

---

## What is Backstage?
[package.json](../packages/backstage-soundcheck/package.json)
**Backstage** is an open-source developer portal platform created by Spotify. It provides:

- **Software Catalog** - Central registry of all services, APIs, and documentation
- **Service Ownership** - Track who owns what and dependencies between services
- **Developer Experience** - Single place for docs, APIs, CI/CD status, and more

Think of it as an **internal developer hub** that shows all your microservices and their metadata.

---

## What is Soundcheck?

**Soundcheck** is a Spotify plugin for Backstage that enforces software quality standards:

- **Fact Collectors** - Gather data about services (security issues, test coverage, etc.)
- **Checks** - Rules that evaluate facts (e.g., "no critical vulnerabilities")
- **Tracks** - Groups of checks forming certification programs (e.g., "Production Ready")
- **Scores** - Shows which services meet standards and which don't

Think of it as a **report card system** for your software catalog.

---

## How They Work Together

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BACKSTAGE                                  │
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────────┐        │
│  │   Catalog   │    │   Entity    │    │    Soundcheck    │        │
│  │  (Service   │───▶│   Pages     │◀───│     Plugin       │        │
│  │   Index)    │    │             │    │   (Compliance)   │        │
│  └─────────────┘    └──────┬──────┘    └────────┬─────────┘        │
│                            │                    │                   │
│                            ▼                    │                   │
│                    ┌──────────────┐             │                   │
│                    │   ZeroPath   │             │                   │
│                    │   Frontend   │             │                   │
│                    │    Plugin    │             │                   │
│                    └──────┬───────┘             │                   │
│                           │                     │                   │
└───────────────────────────┼─────────────────────┼───────────────────┘
                            │                     │
                            ▼                     ▼
                    ┌───────────────┐    ┌───────────────────┐
                    │   Backstage   │    │    Soundcheck     │
                    │     Proxy     │    │  Fact Collector   │
                    │  /zeropath/*  │    │    (ZeroPath)     │
                    └───────┬───────┘    └─────────┬─────────┘
                            │                      │
                            └──────────┬───────────┘
                                       ▼
                            ┌─────────────────────┐
                            │    ZeroPath API     │
                            │  (Security Scans)   │
                            └─────────────────────┘
```

---

## The Three ZeroPath Packages

| Package | Purpose | Runs In |
|---------|---------|---------|
| `@zeropath/backstage-plugin-zeropath` | UI components (cards, tables) | Browser |
| `@zeropath/backstage-plugin-zeropath-common` | Shared types & severity mapping | Both |
| `@zeropath/backstage-soundcheck` | Soundcheck fact collector | Backend |

---

## Data Flow

### 1. Entity-to-Repository Matching

Backstage entities are linked to ZeroPath repositories via annotations:

```yaml
# Backstage Entity                    # ZeroPath Repository
metadata:
  annotations:
    github.com/project-slug:    ───▶  my-org/my-repo
      my-org/my-repo
```

### 2. Frontend Plugin Flow (User Views Component)

```
User clicks component in Catalog
            │
            ▼
ZeroPathSecurityCard renders
            │
            ▼
Hook: useZeroPathRepository()
  └─▶ Calls /api/v1/repositories/list
  └─▶ Matches annotation to repo ID
            │
            ▼
Hook: useZeroPathIssues()
  └─▶ Calls /api/v1/issues/search
  └─▶ Returns issues with scores
            │
            ▼
UI displays severity counts:
  "5 Critical, 12 High, 8 Medium, 3 Low"
```

### 3. Soundcheck Collector Flow (Background)

```
Soundcheck scheduler triggers
            │
            ▼
ZeroPath Collector runs for each entity
            │
            ▼
Fetches repositories from ZeroPath API
            │
            ▼
Matches entity annotation to repo
            │
            ▼
Fetches issues for matched repo
            │
            ▼
Calculates severity snapshot:
{
  critical: { count: 5, oldestAgeDays: 30 },
  high: { count: 12, oldestAgeDays: 45 },
  ...
}
            │
            ▼
Stores as Soundcheck "Fact"
            │
            ▼
Checks evaluate facts:
  Check: "No critical vulnerabilities"
  Rule: critical.count == 0
  Result: FAIL ❌
            │
            ▼
Entity shows compliance score
```

---

## Authentication

### Frontend (via Proxy)

The Backstage proxy injects authentication headers:

```yaml
# app-config.yaml
proxy:
  endpoints:
    '/zeropath':
      target: 'https://zeropath.com'
      headers:
        X-ZeroPath-API-Token-Id: ${ZEROPATH_TOKEN_ID}
        X-ZeroPath-API-Token-Secret: ${ZEROPATH_TOKEN_SECRET}
```

Browser requests go to `/api/proxy/zeropath/*` → Proxy adds headers → Forwards to ZeroPath.

### Backend (Direct)

The Soundcheck collector authenticates directly:

```yaml
# app-config.yaml
soundcheck:
  collectors:
    zeropath:
      tokenId: ${ZEROPATH_TOKEN_ID}
      tokenSecret: ${ZEROPATH_TOKEN_SECRET}
```

---

## Severity Mapping

Both frontend and backend use identical severity windows:

| Severity | Score Range | Color |
|----------|-------------|-------|
| Critical | 90-100 | `#d32f2f` (red) |
| High | 70-89 | `#f57c00` (orange) |
| Medium | 40-69 | `#fbc02d` (yellow) |
| Low | 10-39 | `#1976d2` (blue) |

Defined in `@zeropath/backstage-plugin-zeropath-common`:

```typescript
export const SEVERITY_WINDOWS = [
  { level: 'critical', min: 90, max: 100 },
  { level: 'high', min: 70, max: 89 },
  { level: 'medium', min: 40, max: 69 },
  { level: 'low', min: 10, max: 39 },
];
```

---

## ZeroPath API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/repositories/list` | POST | List all repos in organization |
| `/api/v1/issues/search` | POST | Search issues with filters |
| `/api/v1/issues/get` | POST | Get single issue details |

Full API reference: https://zeropath.com/docs/api-reference/introduction

---

## Soundcheck Facts Schema

The collector produces these facts for each entity:

```typescript
// Fact: zeropath:default/severity_snapshot
{
  critical: { count: number, oldestAgeDays?: number },
  high: { count: number, oldestAgeDays?: number },
  medium: { count: number, oldestAgeDays?: number },
  low: { count: number, oldestAgeDays?: number },
}

// Fact: zeropath:default/issue_counts
{
  critical: number,
  high: number,
  medium: number,
  low: number,
  total: number,
}
```

---

## Example Soundcheck Check

```yaml
# soundcheck-checks.yaml
checks:
  - id: no-critical-vulnerabilities
    name: No Critical Vulnerabilities
    description: Service has no critical security issues
    rule:
      factRef: zeropath:default/severity_snapshot
      path: $.critical.count
      operator: equal
      value: 0
```

---

## Summary

| Component | Role |
|-----------|------|
| **Backstage** | Developer portal & service catalog |
| **Soundcheck** | Compliance scoring engine |
| **ZeroPath Frontend Plugin** | Shows security issues on entity pages |
| **ZeroPath Soundcheck Collector** | Feeds security data for compliance checks |

The frontend plugin provides **immediate visibility** for developers.
The Soundcheck collector enables **automated compliance tracking** for platform teams.
