import {
  createFrontendPlugin,
  PageBlueprint,
  ApiBlueprint,
  NavItemBlueprint,
  createRouteRef,
  FrontendPlugin,
} from '@backstage/frontend-plugin-api';
import {
  EntityCardBlueprint,
  EntityContentBlueprint,
} from '@backstage/plugin-catalog-react/alpha';
import {
  discoveryApiRef,
  fetchApiRef,
  configApiRef,
} from '@backstage/core-plugin-api';
import SecurityIcon from '@material-ui/icons/Security';
import { zeroPathApiRef } from './api/ZeroPathApi';
import { ZeroPathClient } from './api/ZeroPathClient';

// Create route ref for the new frontend system
const zeroPathRouteRef = createRouteRef();

// API Extension - new syntax passes raw params, not createApiFactory
const zeroPathApiExtension = ApiBlueprint.make({
  params: defineParams =>
    defineParams({
      api: zeroPathApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
        configApi: configApiRef,
      },
      factory: ({ discoveryApi, fetchApi, configApi }) =>
        new ZeroPathClient({ discoveryApi, fetchApi, configApi }),
    }),
});

// Standalone Security Page Extension
const zeroPathPageExtension = PageBlueprint.make({
  params: {
    path: '/zeropath',
    routeRef: zeroPathRouteRef,
    loader: async () => {
      const { ZeroPathSecurityContent } = await import(
        './components/ZeroPathSecurityContent'
      );
      return <ZeroPathSecurityContent />;
    },
  },
});

// Navigation Item Extension
const zeroPathNavItemExtension = NavItemBlueprint.make({
  params: {
    title: 'Security',
    icon: SecurityIcon,
    routeRef: zeroPathRouteRef,
  },
});

// Entity Card: Info Card
const zeroPathInfoCardExtension = EntityCardBlueprint.make({
  name: 'info',
  params: {
    type: 'info',
    filter: 'kind:component',
    loader: async () => {
      const { ZeroPathInfoCardWrapper } = await import(
        './components/EntityWrappers'
      );
      return <ZeroPathInfoCardWrapper />;
    },
  },
});

// Entity Card: Summary Cards
const zeroPathSummaryCardExtension = EntityCardBlueprint.make({
  name: 'summary',
  params: {
    type: 'summary',
    filter: 'kind:component',
    loader: async () => {
      const { ZeroPathSummaryCardsWrapper } = await import(
        './components/EntityWrappers'
      );
      return <ZeroPathSummaryCardsWrapper />;
    },
  },
});

// Entity Content: Security Tab
const zeroPathSecurityContentExtension = EntityContentBlueprint.make({
  name: 'security',
  params: {
    path: '/security',
    title: 'Security',
    filter: 'kind:component',
    loader: async () => {
      const { ZeroPathSecurityContent } = await import(
        './components/ZeroPathSecurityContent'
      );
      return <ZeroPathSecurityContent />;
    },
  },
});

// Create the new frontend plugin
const zeroPathPlugin: FrontendPlugin = createFrontendPlugin({
  pluginId: 'zeropath',
  routes: {
    root: zeroPathRouteRef,
  },
  extensions: [
    zeroPathApiExtension,
    zeroPathPageExtension,
    zeroPathNavItemExtension,
    zeroPathInfoCardExtension,
    zeroPathSummaryCardExtension,
    zeroPathSecurityContentExtension,
  ],
});

export default zeroPathPlugin;
