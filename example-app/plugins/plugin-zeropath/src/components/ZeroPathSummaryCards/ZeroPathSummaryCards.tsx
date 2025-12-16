import { InfoCard } from '@backstage/core-components';
import {
  Box,
  Grid,
  Typography,
  makeStyles,
  Tooltip,
} from '@material-ui/core';
import SecurityIcon from '@material-ui/icons/Security';
import { ZeroPathRepository, IssueCounts } from '@internal/plugin-zeropath-common';
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
  icon: {
    marginRight: theme.spacing(1),
    verticalAlign: 'middle',
  },
}));

interface ZeroPathSummaryCardsProps {
  repository: ZeroPathRepository;
  severityCounts: IssueCounts;
}

export const ZeroPathSummaryCards = ({
  severityCounts,
}: ZeroPathSummaryCardsProps) => {
  const classes = useStyles();

  const totalIssues = severityCounts?.total ?? 0;

  return (
    <InfoCard
      title={
        <Box display="flex" alignItems="center">
          <SecurityIcon className={classes.icon} />
          Security Issues
        </Box>
      }
      subheader={`${totalIssues} open ${totalIssues === 1 ? 'issue' : 'issues'}`}
    >
      <Grid container spacing={1}>
        <Grid item xs={3}>
          <Tooltip title="Score 90-100" placement="top">
            <Box className={classes.severityBox}>
              <Typography className={`${classes.countText} ${classes.critical}`}>
                {severityCounts?.critical ?? 0}
              </Typography>
              <Typography className={classes.label}>Critical</Typography>
            </Box>
          </Tooltip>
        </Grid>
        <Grid item xs={3}>
          <Tooltip title="Score 70-89" placement="top">
            <Box className={classes.severityBox}>
              <Typography className={`${classes.countText} ${classes.high}`}>
                {severityCounts?.high ?? 0}
              </Typography>
              <Typography className={classes.label}>High</Typography>
            </Box>
          </Tooltip>
        </Grid>
        <Grid item xs={3}>
          <Tooltip title="Score 40-69" placement="top">
            <Box className={classes.severityBox}>
              <Typography className={`${classes.countText} ${classes.medium}`}>
                {severityCounts?.medium ?? 0}
              </Typography>
              <Typography className={classes.label}>Medium</Typography>
            </Box>
          </Tooltip>
        </Grid>
        <Grid item xs={3}>
          <Tooltip title="Score 10-39" placement="top">
            <Box className={classes.severityBox}>
              <Typography className={`${classes.countText} ${classes.low}`}>
                {severityCounts?.low ?? 0}
              </Typography>
              <Typography className={classes.label}>Low</Typography>
            </Box>
          </Tooltip>
        </Grid>
      </Grid>
    </InfoCard>
  );
};
