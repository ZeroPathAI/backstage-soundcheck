import { useState, useMemo } from 'react';
import { useAsync } from 'react-use';
import { useApi } from '@backstage/core-plugin-api';
import {
  Content,
  ContentHeader,
  Progress,
  ResponseErrorPanel,
  Table,
  TableColumn,
  Link,
  SupportButton,
  EmptyState,
} from '@backstage/core-components';
import {
  Box,
  Chip,
  Grid,
  Typography,
  makeStyles,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@material-ui/core';
import LaunchIcon from '@material-ui/icons/Launch';
import ClearIcon from '@material-ui/icons/Clear';
import { zeroPathApiRef } from '../../api/ZeroPathApi';
import { ZeroPathIssue, SeverityLevel, mapScoreToSeverity } from '../../api/types';
import { ZeroPathRepository } from '@internal/plugin-zeropath-common';
import { SeverityChip } from './SeverityChip';
import { IssueDetailsPanel } from './IssueDetailsPanel';
import { ZeroPathInfoCard } from '../ZeroPathInfoCard';
import { ZeroPathSummaryCards } from '../ZeroPathSummaryCards';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2, 2, 0, 2),
  },
  cardsSection: {
    marginBottom: theme.spacing(3),
  },
  container: {
    width: '100%',
  },
  fileCell: {
    fontFamily: '"Roboto Mono", monospace',
    fontSize: '0.8rem',
    color: theme.palette.text.primary,
  },
  vulnCell: {
    maxWidth: 350,
  },
  vulnTitle: {
    fontWeight: 600,
    fontSize: '0.875rem',
    marginBottom: theme.spacing(0.5),
  },
  vulnMeta: {
    fontSize: '0.75rem',
  },
  statusChip: {
    textTransform: 'capitalize',
    fontWeight: 500,
  },
  linkIcon: {
    fontSize: '0.875rem',
    marginLeft: 4,
    verticalAlign: 'middle',
  },
  tableSection: {
    '& .MuiPaper-root': {
      borderRadius: theme.shape.borderRadius * 2,
      boxShadow: theme.shadows[1],
    },
  },
  emptyStateWrapper: {
    padding: theme.spacing(4),
  },
  filterChip: {
    fontWeight: 500,
    height: 20,
    verticalAlign: 'middle',
    marginLeft: theme.spacing(1),
  },
  tableTitleWrapper: {
    display: 'inline',
  },
  repoSelector: {
    marginBottom: theme.spacing(3),
    minWidth: 300,
  },
}));

export const ZeroPathSecurityContent = () => {
  const classes = useStyles();
  const api = useApi(zeroPathApiRef);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<ZeroPathIssue | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel | null>(null);

  // Fetch all repositories from API
  const {
    value: repositories,
    loading: reposLoading,
    error: reposError,
  } = useAsync(async () => {
    const repos = await api.listRepositories();
    // Auto-select first repo if none selected
    if (repos.length > 0 && !selectedRepoId) {
      setSelectedRepoId(String(repos[0].id));
    }
    return repos;
  }, [api]);

  const repository = useMemo(() => {
    if (!repositories || !selectedRepoId) return null;
    return repositories.find(r => String(r.id) === selectedRepoId) ?? null;
  }, [repositories, selectedRepoId]);

  // Fetch open issues for selected repository
  const {
    value: data,
    loading: issuesLoading,
    error: issuesError,
  } = useAsync(async () => {
    if (!selectedRepoId) return { issues: [], total: 0 };
    const result = await api.searchIssues(selectedRepoId, { status: ['open'] });
    return result;
  }, [selectedRepoId, api]);

  // Fetch severity counts for selected repository
  const {
    value: severityCounts,
    loading: countsLoading,
    error: countsError,
  } = useAsync(async () => {
    if (!selectedRepoId) return { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    return api.getIssueCounts(selectedRepoId);
  }, [selectedRepoId, api]);

  // Filter issues based on selected severity
  const filteredIssues = useMemo(() => {
    const issues = data?.issues ?? [];
    if (!selectedSeverity) return issues;

    return issues.filter(issue => {
      const severity = mapScoreToSeverity(issue.score);
      return severity === selectedSeverity;
    });
  }, [data?.issues, selectedSeverity]);

  const columns: TableColumn<ZeroPathIssue>[] = [
    {
      title: 'Severity',
      field: 'score',
      render: row => <SeverityChip score={row.score} />,
      width: '100px',
      customSort: (a, b) => b.score - a.score,
    },
    {
      title: 'Vulnerability',
      field: 'generatedTitle',
      render: row => (
        <Box className={classes.vulnCell}>
          <Typography className={classes.vulnTitle}>
            {row.generatedTitle || row.vulnClass}
          </Typography>
          <Typography className={classes.vulnMeta} color="textSecondary">
            {row.vulnCategory}
            {row.cwes && row.cwes.length > 0 && ` - ${row.cwes[0]}`}
          </Typography>
        </Box>
      ),
    },
    {
      title: 'File',
      field: 'affectedFile',
      render: row => (
        <Box>
          <Typography className={classes.fileCell}>
            {row.affectedFile?.split('/').pop()}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Line {row.startLine}
            {row.startLine !== row.endLine && `-${row.endLine}`}
          </Typography>
        </Box>
      ),
    },
    {
      title: 'Language',
      field: 'language',
      width: '100px',
    },
    {
      title: 'Status',
      field: 'status',
      render: row => (
        <Chip
          label={row.status}
          size="small"
          className={classes.statusChip}
          color={row.status === 'open' ? 'secondary' : 'default'}
        />
      ),
      width: '100px',
    },
    {
      title: 'Created',
      field: 'createdAt',
      render: row => {
        if (!row.createdAt) return '-';
        const date = new Date(row.createdAt);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
      },
      width: '120px',
    },
    {
      title: 'Actions',
      render: row => (
        <Link to={row.url || '#'} onClick={e => e.stopPropagation()}>
          View <LaunchIcon className={classes.linkIcon} />
        </Link>
      ),
      width: '80px',
    },
  ];

  const loading = reposLoading || issuesLoading || countsLoading;
  const error = reposError || issuesError || countsError;

  if (reposLoading) {
    return (
      <Content className={classes.root}>
        <ContentHeader title="Security" />
        <Progress />
      </Content>
    );
  }

  if (error) {
    return (
      <Content className={classes.root}>
        <ContentHeader title="Security" />
        <ResponseErrorPanel error={error} />
      </Content>
    );
  }

  if (!repositories || repositories.length === 0) {
    return (
      <Content className={classes.root}>
        <ContentHeader title="Security">
          <SupportButton>
            View and manage security vulnerabilities detected by ZeroPath.
          </SupportButton>
        </ContentHeader>
        <Box className={classes.emptyStateWrapper}>
          <EmptyState
            title="No repositories found"
            description="No repositories are connected to ZeroPath. Connect repositories in your ZeroPath dashboard to see security issues."
            missing="data"
          />
        </Box>
      </Content>
    );
  }

  const issues = data?.issues ?? [];
  const counts = severityCounts ?? { critical: 0, high: 0, medium: 0, low: 0, total: 0 };

  const tableTitle = (
    <Box className={classes.tableTitleWrapper}>
      <span>
        {selectedSeverity
          ? `${filteredIssues.length} ${selectedSeverity.charAt(0).toUpperCase() + selectedSeverity.slice(1)} Issues`
          : `${data?.total ?? 0} Open Issues`
        }
      </span>
      {selectedSeverity && (
        <Chip
          size="small"
          label={selectedSeverity.charAt(0).toUpperCase() + selectedSeverity.slice(1)}
          onDelete={() => setSelectedSeverity(null)}
          deleteIcon={<ClearIcon />}
          className={classes.filterChip}
          color="primary"
          variant="outlined"
        />
      )}
    </Box>
  );

  return (
    <Content className={classes.root}>
      <ContentHeader title="Security">
        <SupportButton>
          View and manage security vulnerabilities detected by ZeroPath.
        </SupportButton>
      </ContentHeader>

      {/* Repository Selector */}
      <FormControl variant="outlined" className={classes.repoSelector}>
        <InputLabel id="repo-select-label">Repository</InputLabel>
        <Select
          labelId="repo-select-label"
          value={selectedRepoId || ''}
          onChange={e => {
            setSelectedRepoId(e.target.value as string);
            setSelectedSeverity(null);
          }}
          label="Repository"
        >
          {repositories.map((repo: ZeroPathRepository) => (
            <MenuItem key={String(repo.id)} value={String(repo.id)}>
              {repo.repositoryName || repo.name} ({repo.issueCounts?.open ?? 0} open issues)
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {repository && (
        <>
          {/* Cards Section */}
          <Box className={classes.cardsSection}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <ZeroPathInfoCard repository={repository} />
              </Grid>
              <Grid item xs={12} md={6}>
                <ZeroPathSummaryCards
                  repository={repository}
                  severityCounts={counts}
                  issues={issues}
                  selectedSeverity={selectedSeverity}
                  onSeverityClick={setSelectedSeverity}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Issues Table */}
          <Box className={classes.tableSection}>
            {loading ? (
              <Progress />
            ) : issues.length === 0 ? (
              <Box className={classes.emptyStateWrapper}>
                <EmptyState
                  title="No open issues"
                  description="ZeroPath hasn't detected any open security issues in this repository."
                  missing="data"
                />
              </Box>
            ) : (
              <Box className={classes.container}>
                <Table
                  title={tableTitle}
                  columns={columns}
                  data={filteredIssues}
                  options={{
                    search: true,
                    paging: true,
                    pageSize: 20,
                    pageSizeOptions: [10, 20, 50],
                    sorting: true,
                    padding: 'dense',
                  }}
                  onRowClick={(_, row) => row && setSelectedIssue(row)}
                />
              </Box>
            )}
          </Box>
        </>
      )}

      {selectedIssue && (
        <IssueDetailsPanel
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </Content>
  );
};
