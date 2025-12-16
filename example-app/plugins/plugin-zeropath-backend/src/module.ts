import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { ZeroPathEntityProvider } from './ZeroPathEntityProvider';

/**
 * Backend module that registers the ZeroPath entity provider with the catalog.
 * This provider automatically creates Component entities from ZeroPath repositories.
 */
export const catalogModuleZeropathEntityProvider = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'zeropath-entity-provider',
  register(reg) {
    reg.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        scheduler: coreServices.scheduler,
      },
      async init({ catalog, config, logger, scheduler }) {
        const provider = ZeroPathEntityProvider.fromConfig(config, { logger });

        catalog.addEntityProvider(provider);

        // Run immediately on startup
        setTimeout(async () => {
          try {
            await provider.run();
            logger.info('ZeroPath entity provider initial fetch completed');
          } catch (error) {
            logger.error(`ZeroPath entity provider initial fetch failed: ${error}`);
          }
        }, 5000); // Small delay to ensure catalog is ready

        // Schedule periodic refresh
        await scheduler.scheduleTask({
          id: 'zeropath-entity-provider-refresh',
          frequency: { minutes: 30 },
          timeout: { minutes: 5 },
          fn: async () => {
            await provider.run();
          },
        });

        logger.info('ZeroPath entity provider registered with catalog');
      },
    });
  },
});

export default catalogModuleZeropathEntityProvider;
