import { createApp } from '@backstage/frontend-defaults';

// Import plugins from their alpha exports (new frontend system)
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import searchPlugin from '@backstage/plugin-search/alpha';
import userSettingsPlugin from '@backstage/plugin-user-settings/alpha';
import orgPlugin from '@backstage/plugin-org/alpha';

// Import our custom ZeroPath plugin
import zeroPathPlugin from '@internal/plugin-zeropath/alpha';

// Import custom nav module for sidebar with logo
import { navModule } from './modules/nav';

const app = createApp({
  features: [
    // Custom modules (override built-in extensions)
    navModule,
    // Core plugins
    catalogPlugin,
    searchPlugin,
    userSettingsPlugin,
    orgPlugin,
    // Custom plugins
    zeroPathPlugin,
  ],
  bindRoutes({ bind }) {
    // Bind external routes if needed
    bind(orgPlugin.externalRoutes, {
      catalogIndex: catalogPlugin.routes.catalogIndex,
    });
  },
});

export default app.createRoot();
