import { coreServices, createBackendModule } from '@backstage/backend-plugin-api';
import { factCollectionExtensionPoint } from '@spotify/backstage-plugin-soundcheck-node';
import { ZeropathFactCollector } from './collector';

export const soundcheckModuleZeropath = createBackendModule({
  pluginId: 'soundcheck',
  moduleId: 'zeropath',
  register(reg) {
    reg.registerInit({
      deps: {
        logger: coreServices.logger,
        soundcheck: factCollectionExtensionPoint,
      },
      async init({ logger, soundcheck }) {
        soundcheck.addFactCollector(ZeropathFactCollector.create(logger));
      },
    });
  },
});

export default soundcheckModuleZeropath;
