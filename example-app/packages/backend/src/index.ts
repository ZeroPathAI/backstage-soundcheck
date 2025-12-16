/*
 * ZeroPath Backstage Demo Backend
 *
 * Minimal backend configuration focused on catalog and ZeroPath integration.
 */

import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));

// auth plugin
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));

// catalog plugin
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));

// ZeroPath entity provider - auto-generates Component entities from ZeroPath repos
backend.add(import('@internal/plugin-zeropath-backend'));


// permission plugin
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(
  import('@backstage/plugin-permission-backend-module-allow-all-policy'),
);

// search plugin
backend.add(import('@backstage/plugin-search-backend'));
backend.add(import('@backstage/plugin-search-backend-module-pg'));
backend.add(import('@backstage/plugin-search-backend-module-catalog'));

// Soundcheck plugin with ZeroPath collector
backend.add(import('@spotify/backstage-plugin-soundcheck-backend'));
backend.add(import('@internal/backstage-soundcheck'));

backend.start();
