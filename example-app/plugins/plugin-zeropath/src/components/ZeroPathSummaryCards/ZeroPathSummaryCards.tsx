import { InfoCard } from '@backstage/core-components';
import {
  Box,
  Typography,
  makeStyles,
  Tooltip,
} from '@material-ui/core';
import { ZeroPathRepository, IssueCounts, SeverityLevel, ZeroPathIssue } from '@internal/plugin-zeropath-common';
import { getSeverityColor } from '../../api/types';

const useStyles = makeStyles(theme => ({
  badgeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      transform: 'scale(1.05)',
      boxShadow: theme.shadows[2],
    },
  },
  badgeSelected: {
    boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
  },
  badgeCount: {
    padding: theme.spacing(0.5, 1),
    fontWeight: 600,
    fontSize: '0.875rem',
    backgroundColor: '#e0e0e0',
    color: '#212121',
    minWidth: 28,
    textAlign: 'center',
  },
  badgeLabel: {
    padding: theme.spacing(0.5, 1),
    fontWeight: 700,
    fontSize: '0.875rem',
    minWidth: 24,
    textAlign: 'center',
  },
  criticalBg: {
    backgroundColor: getSeverityColor('critical'),
    color: '#fff',
  },
  highBg: {
    backgroundColor: getSeverityColor('high'),
    color: '#fff',
  },
  mediumBg: {
    backgroundColor: getSeverityColor('medium'),
    color: '#fff',
  },
  lowBg: {
    backgroundColor: getSeverityColor('low'),
    color: '#fff',
  },
}));

interface ZeroPathSummaryCardsProps {
  repository: ZeroPathRepository;
  severityCounts: IssueCounts;
  issues?: ZeroPathIssue[];
  selectedSeverity?: SeverityLevel | null;
  onSeverityClick?: (severity: SeverityLevel | null) => void;
}

// Calculate trend based on issue creation dates
const calculateTrend = (issues: ZeroPathIssue[]): { direction: 'up' | 'down' | 'flat'; percentage: number } => {
  if (!issues || issues.length === 0) {
    return { direction: 'flat', percentage: 0 };
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const recentIssues = issues.filter(issue => {
    if (!issue.createdAt) return false;
    const date = new Date(issue.createdAt);
    return date >= sevenDaysAgo;
  }).length;

  const previousIssues = issues.filter(issue => {
    if (!issue.createdAt) return false;
    const date = new Date(issue.createdAt);
    return date >= fourteenDaysAgo && date < sevenDaysAgo;
  }).length;

  if (previousIssues === 0 && recentIssues === 0) {
    return { direction: 'flat', percentage: 0 };
  }

  if (previousIssues === 0) {
    return { direction: 'up', percentage: 100 };
  }

  const change = ((recentIssues - previousIssues) / previousIssues) * 100;

  if (Math.abs(change) < 5) {
    return { direction: 'flat', percentage: 0 };
  }

  return {
    direction: change > 0 ? 'up' : 'down',
    percentage: Math.abs(Math.round(change)),
  };
};

export const ZeroPathSummaryCards = ({
  severityCounts,
  issues = [],
  selectedSeverity,
  onSeverityClick,
}: ZeroPathSummaryCardsProps) => {
  const classes = useStyles();

  const totalIssues = severityCounts?.total ?? 0;
  const trend = calculateTrend(issues);

  const handleSeverityClick = (severity: SeverityLevel) => {
    if (onSeverityClick) {
      onSeverityClick(selectedSeverity === severity ? null : severity);
    }
  };

  const getTrendText = () => {
    if (trend.direction === 'flat') return 'Stable';
    if (trend.direction === 'up') return `+${trend.percentage}%`;
    return `-${trend.percentage}%`;
  };

  const getTrendTooltip = () => {
    if (trend.direction === 'flat') return 'No significant change in last 7 days';
    if (trend.direction === 'up') return `${trend.percentage}% increase vs previous 7 days`;
    return `${trend.percentage}% decrease vs previous 7 days`;
  };

  const severities: { key: SeverityLevel; label: string; bgClass: string }[] = [
    { key: 'critical', label: 'C', bgClass: classes.criticalBg },
    { key: 'high', label: 'H', bgClass: classes.highBg },
    { key: 'medium', label: 'M', bgClass: classes.mediumBg },
    { key: 'low', label: 'L', bgClass: classes.lowBg },
  ];

  return (
    <InfoCard
      title="Vulnerabilities"
      subheader={
        <Tooltip title={getTrendTooltip()} arrow>
          <span>{totalIssues} open {totalIssues === 1 ? 'issue' : 'issues'} · {getTrendText()}</span>
        </Tooltip>
      }
    >
      <Box className={classes.badgeContainer}>
        {severities.map(({ key, label, bgClass }) => (
          <Tooltip key={key} title={`Click to filter ${key} issues`} arrow>
            <Box
              className={`${classes.badge} ${selectedSeverity === key ? classes.badgeSelected : ''}`}
              onClick={() => handleSeverityClick(key)}
            >
              <Typography component="span" className={classes.badgeCount}>
                {severityCounts?.[key] ?? 0}
              </Typography>
              <Typography component="span" className={`${classes.badgeLabel} ${bgClass}`}>
                {label}
              </Typography>
            </Box>
          </Tooltip>
        ))}
      </Box>
    </InfoCard>
  );
};
