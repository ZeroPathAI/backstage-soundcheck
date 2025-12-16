import { makeStyles } from '@material-ui/core';
import {
  NavContentBlueprint,
  NavContentComponentProps,
} from '@backstage/frontend-plugin-api';
import {
  Sidebar,
  sidebarConfig,
  SidebarDivider,
  SidebarItem,
  SidebarPage,
  SidebarSpace,
  useSidebarOpenState,
  Link,
} from '@backstage/core-components';
import SettingsIcon from '@material-ui/icons/Settings';
import LogoFull from '../../components/Root/LogoFull';
import LogoIcon from '../../components/Root/LogoIcon';

const useSidebarLogoStyles = makeStyles({
  root: {
    width: sidebarConfig.drawerWidthClosed,
    height: 3 * sidebarConfig.logoHeight,
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    marginBottom: -14,
  },
  link: {
    width: sidebarConfig.drawerWidthClosed,
    marginLeft: 24,
  },
});

const SidebarLogo = () => {
  const classes = useSidebarLogoStyles();
  const { isOpen } = useSidebarOpenState();

  return (
    <div className={classes.root}>
      <Link to="/" underline="none" className={classes.link} aria-label="Home">
        {isOpen ? <LogoFull /> : <LogoIcon />}
      </Link>
    </div>
  );
};

const SidebarContent = ({ items }: NavContentComponentProps) => {
  return (
    <SidebarPage>
      <Sidebar>
        <SidebarLogo />
        <SidebarDivider />
        {items.map(item => (
          <SidebarItem
            key={item.to}
            icon={item.icon}
            to={item.to}
            text={item.text}
          />
        ))}
        <SidebarSpace />
        <SidebarDivider />
        <SidebarItem icon={SettingsIcon} to="/settings" text="Settings" />
      </Sidebar>
    </SidebarPage>
  );
};

export const sidebarNavExtension = NavContentBlueprint.make({
  params: {
    component: SidebarContent,
  },
});
