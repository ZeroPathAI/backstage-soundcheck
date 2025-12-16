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
  cardContent: {
    padding: theme.spacing(0.5, 0),
  },
  severityBox: {
    textAlign: 'center',
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    transition: 'all 0.2s ease-in-out',
    cursor: 'default',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  countText: {
    fontWeight: 700,
    fontSize: '1.5rem',
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
    letterSpacing: '0.75px',
    fontWeight: 600,
  },
  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  subheader: {
    color: theme.palette.text.secondary,
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
        <Box className={classes.titleWrapper}>
          <SecurityIcon className={classes.icon} />
          <Typography variant="h6">Security Issues</Typography>
        </Box>
      }
      subheader={
        <Typography variant="body2" className={classes.subheader}>
          {totalIssues} open {totalIssues === 1 ? 'issue' : 'issues'}
        </Typography>
      }
    >
      <Box className={classes.cardContent}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Tooltip title="Score 90-100" placement="top" arrow>
              <Box className={classes.severityBox}>
                <Typography className={`${classes.countText} ${classes.critical}`}>
                  {severityCounts?.critical ?? 0}
                </Typography>
                <Typography className={classes.label}>Critical</Typography>
              </Box>
            </Tooltip>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Tooltip title="Score 70-89" placement="top" arrow>
              <Box className={classes.severityBox}>
                <Typography className={`${classes.countText} ${classes.high}`}>
                  {severityCounts?.high ?? 0}
                </Typography>
                <Typography className={classes.label}>High</Typography>
              </Box>
            </Tooltip>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Tooltip title="Score 40-69" placement="top" arrow>
              <Box className={classes.severityBox}>
                <Typography className={`${classes.countText} ${classes.medium}`}>
                  {severityCounts?.medium ?? 0}
                </Typography>
                <Typography className={classes.label}>Medium</Typography>
              </Box>
            </Tooltip>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Tooltip title="Score 10-39" placement="top" arrow>
              <Box className={classes.severityBox}>
                <Typography className={`${classes.countText} ${classes.low}`}>
                  {severityCounts?.low ?? 0}
                </Typography>
                <Typography className={classes.label}>Low</Typography>
              </Box>
            </Tooltip>
          </Grid>
        </Grid>
      </Box>
    </InfoCard>
  );
};
