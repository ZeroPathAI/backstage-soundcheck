import {
  createPlugin,
  createApiFactory,
  createComponentExtension,
  createRoutableExtension,
  discoveryApiRef,
  fetchApiRef,
  configApiRef,
} from '@backstage/core-plugin-api';
import { zeroPathApiRef } from './api/ZeroPathApi';
import { ZeroPathClient } from './api/ZeroPathClient';
import { rootRouteRef } from './routes';

export const zeroPathPlugin = createPlugin({
  id: 'zeropath',
  routes: {
    root: rootRouteRef,
  },
  apis: [
    createApiFactory({
      api: zeroPathApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
        configApi: configApiRef,
      },
      factory: ({ discoveryApi, fetchApi, configApi }) =>
        new ZeroPathClient({ discoveryApi, fetchApi, configApi }),
    }),
  ],
});

export const ZeroPathSecurityCard = zeroPathPlugin.provide(
  createComponentExtension({
    name: 'ZeroPathSecurityCard',
    component: {
      lazy: () =>
        import('./components/ZeroPathSecurityCard').then(
          m => m.ZeroPathSecurityCard,
        ),
    },
  }),
);

export const ZeroPathSecurityContent = zeroPathPlugin.provide(
  createRoutableExtension({
    name: 'ZeroPathSecurityContent',
    component: () =>
      import('./components/ZeroPathSecurityContent').then(
        m => m.ZeroPathSecurityContent,
      ),
    mountPoint: rootRouteRef,
  }),
);
