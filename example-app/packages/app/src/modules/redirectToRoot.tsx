import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  createFrontendModule,
  PageBlueprint,
  createRouteRef,
} from '@backstage/frontend-plugin-api';

const rootRouteRef = createRouteRef();

const rootRedirectPage = PageBlueprint.makeWithOverrides({
  factory: (originalFactory) => {
    return originalFactory({
      path: '/',
      routeRef: rootRouteRef,
      loader: async () => <Navigate to="/catalog" replace />,
    });
  },
});

export const rootRedirectModule = createFrontendModule({
  pluginId: 'app',
  extensions: [rootRedirectPage],
});
