import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { sidebarNavExtension } from './Sidebar';

export const navModule = createFrontendModule({
  pluginId: 'app',
  extensions: [sidebarNavExtension],
});
