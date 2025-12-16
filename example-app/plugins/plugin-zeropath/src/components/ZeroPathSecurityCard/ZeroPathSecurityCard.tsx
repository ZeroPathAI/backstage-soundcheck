import { useAsync } from 'react-use';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import {
  InfoCard,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import {
  Box,
  Grid,
  Typography,
  makeStyles,
  Tooltip,
} from '@material-ui/core';
import SecurityIcon from '@material-ui/icons/Security';
import { zeroPathApiRef } from '../../api/ZeroPathApi';
import { useZeroPathRepository } from '../../hooks/useZeroPathRepository';
import { getSeverityColor } from '../../api/types';

const useStyles = makeStyles(theme => ({
  severityBox: {
    textAlign: 'center',
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  countText: {
    fontWeight: 'bold',
    fontSize: '1.75rem',
    lineHeight: 1.2,
  },
  critical: {
    color: getSeverityColor('critical'),
  },
  high: {
    color: getSeverityColor('high'),
  },
  medium: {
    color: getSeverityColor('medium'),
  },
  low: {
    color: getSeverityColor('low'),
  },
  label: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  missingAnnotation: {
    padding: theme.spacing(2),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  notConfigured: {
    padding: theme.spacing(2),
    textAlign: 'center',
  },
  icon: {
    marginRight: theme.spacing(1),
    verticalAlign: 'middle',
  },
}));

export const ZeroPathSecurityCard = () => {
  const classes = useStyles();
  const { entity } = useEntity();
  const api = useApi(zeroPathApiRef);
  const {
    repository,
    loading: repoLoading,
    error: repoError,
    missingAnnotation,
  } = useZeroPathRepository(entity);

  const {
    value: counts,
    loading,
    error,
  } = useAsync(async () => {
    if (!repository?.id) return null;
    return api.getIssueCounts(String(repository.id));
  }, [repository?.id, api]);

  if (missingAnnotation) {
    return (
      <InfoCard title="Security Issues">
        <Box className={classes.missingAnnotation}>
          <Typography variant="body2">
            Add <code>github.com/project-slug</code> annotation to enable
            ZeroPath security scanning.
          </Typography>
        </Box>
      </InfoCard>
    );
  }

  if (repoLoading || loading) {
    return (
      <InfoCard title="Security Issues">
        <Progress />
      </InfoCard>
    );
  }

  if (repoError || error) {
    return (
      <InfoCard title="Security Issues">
        <ResponseErrorPanel error={repoError || error!} />
      </InfoCard>
    );
  }

  if (!repository) {
    return (
      <InfoCard title="Security Issues">
        <Box className={classes.notConfigured}>
          <Typography variant="body2" color="textSecondary">
            Repository not found in ZeroPath.
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Ensure the repository is connected in your ZeroPath dashboard.
          </Typography>
        </Box>
      </InfoCard>
    );
  }

  const totalIssues = counts?.total ?? 0;

  return (
    <InfoCard
      title={
        <Box display="flex" alignItems="center">
          <SecurityIcon className={classes.icon} />
          Security Issues
        </Box>
      }
      subheader={`${totalIssues} open ${totalIssues === 1 ? 'issue' : 'issues'}`}
      deepLink={{
        title: 'View all issues',
        link: 'security',
      }}
    >
      <Grid container spacing={1}>
        <Grid item xs={3}>
          <Tooltip title="Score 90-100" placement="top">
            <Box className={classes.severityBox}>
              <Typography className={`${classes.countText} ${classes.critical}`}>
                {counts?.critical ?? 0}
              </Typography>
              <Typography className={classes.label}>Critical</Typography>
            </Box>
          </Tooltip>
        </Grid>
        <Grid item xs={3}>
          <Tooltip title="Score 70-89" placement="top">
            <Box className={classes.severityBox}>
              <Typography className={`${classes.countText} ${classes.high}`}>
                {counts?.high ?? 0}
              </Typography>
              <Typography className={classes.label}>High</Typography>
            </Box>
          </Tooltip>
        </Grid>
        <Grid item xs={3}>
          <Tooltip title="Score 40-69" placement="top">
            <Box className={classes.severityBox}>
              <Typography className={`${classes.countText} ${classes.medium}`}>
                {counts?.medium ?? 0}
              </Typography>
              <Typography className={classes.label}>Medium</Typography>
            </Box>
          </Tooltip>
        </Grid>
        <Grid item xs={3}>
          <Tooltip title="Score 10-39" placement="top">
            <Box className={classes.severityBox}>
              <Typography className={`${classes.countText} ${classes.low}`}>
                {counts?.low ?? 0}
              </Typography>
              <Typography className={classes.label}>Low</Typography>
            </Box>
          </Tooltip>
        </Grid>
      </Grid>
    </InfoCard>
  );
};
