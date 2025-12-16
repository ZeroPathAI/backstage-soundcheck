import { useState } from 'react';
import { useAsync } from 'react-use';
import { useEntity } from '@backstage/plugin-catalog-react';
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
} from '@material-ui/core';
import LaunchIcon from '@material-ui/icons/Launch';
import { zeroPathApiRef } from '../../api/ZeroPathApi';
import { ZeroPathIssue } from '../../api/types';
import { useZeroPathRepository } from '../../hooks/useZeroPathRepository';
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
}));

export const ZeroPathSecurityContent = () => {
  const classes = useStyles();
  const { entity } = useEntity();
  const api = useApi(zeroPathApiRef);
  const {
    repository,
    loading: repoLoading,
    error: repoError,
    missingAnnotation,
  } = useZeroPathRepository(entity);
  const [selectedIssue, setSelectedIssue] = useState<ZeroPathIssue | null>(null);

  // Fetch open issues
  const {
    value: data,
    loading: issuesLoading,
    error: issuesError,
  } = useAsync(async () => {
    if (!repository?.id) return { issues: [], total: 0 };
    return api.searchIssues(String(repository.id), { status: ['open'] });
  }, [repository?.id, api]);

  // Fetch severity counts
  const {
    value: severityCounts,
    loading: countsLoading,
    error: countsError,
  } = useAsync(async () => {
    if (!repository?.id) return { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    return api.getIssueCounts(String(repository.id));
  }, [repository?.id, api]);

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

  if (missingAnnotation) {
    return (
      <Content className={classes.root}>
        <ContentHeader title="Security">
          <SupportButton>
            View and manage security vulnerabilities detected by ZeroPath.
          </SupportButton>
        </ContentHeader>
        <Box className={classes.emptyStateWrapper}>
          <EmptyState
            title="Missing annotation"
            description="Add the github.com/project-slug annotation to this entity to enable ZeroPath security scanning."
            missing="field"
          />
        </Box>
      </Content>
    );
  }

  const loading = repoLoading || issuesLoading || countsLoading;
  const error = repoError || issuesError || countsError;

  if (loading) {
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

  if (!repository) {
    return (
      <Content className={classes.root}>
        <ContentHeader title="Security">
          <SupportButton>
            View and manage security vulnerabilities detected by ZeroPath.
          </SupportButton>
        </ContentHeader>
        <Box className={classes.emptyStateWrapper}>
          <EmptyState
            title="Repository not found"
            description="This repository is not connected to ZeroPath. Connect it in your ZeroPath dashboard to see security issues."
            missing="data"
          />
        </Box>
      </Content>
    );
  }

  const issues = data?.issues ?? [];
  const counts = severityCounts ?? { critical: 0, high: 0, medium: 0, low: 0, total: 0 };

  return (
    <Content className={classes.root}>
      <ContentHeader title="Security">
        <SupportButton>
          View and manage security vulnerabilities detected by ZeroPath.
        </SupportButton>
      </ContentHeader>

      {/* Cards Section */}
      <Box className={classes.cardsSection}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <ZeroPathInfoCard repository={repository} />
          </Grid>
          <Grid item xs={12}>
            <ZeroPathSummaryCards
              repository={repository}
              severityCounts={counts}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Issues Table */}
      <Box className={classes.tableSection}>
        {issues.length === 0 ? (
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
              title={`${data?.total ?? 0} Open Issues`}
              columns={columns}
              data={issues}
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

      {selectedIssue && (
        <IssueDetailsPanel
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </Content>
  );
};
