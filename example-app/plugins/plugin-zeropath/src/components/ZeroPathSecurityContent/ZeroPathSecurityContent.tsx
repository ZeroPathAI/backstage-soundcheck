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
  topSection: {
    marginBottom: theme.spacing(3),
  },
  container: {
    width: '100%',
  },
  fileCell: {
    fontFamily: 'monospace',
    fontSize: '0.85rem',
  },
  vulnCell: {
    maxWidth: 300,
  },
  statusChip: {
    textTransform: 'capitalize',
  },
  linkIcon: {
    fontSize: '0.9rem',
    marginLeft: 4,
    verticalAlign: 'middle',
  },
  issuesSection: {
    marginTop: theme.spacing(3),
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
          <Typography variant="body2" style={{ fontWeight: 500 }}>
            {row.generatedTitle || row.vulnClass}
          </Typography>
          <Typography variant="caption" color="textSecondary">
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
      width: '100px',
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
      <Content>
        <ContentHeader title="Security">
          <SupportButton>
            View and manage security vulnerabilities detected by ZeroPath.
          </SupportButton>
        </ContentHeader>
        <EmptyState
          title="Missing annotation"
          description="Add the github.com/project-slug annotation to this entity to enable ZeroPath security scanning."
          missing="field"
        />
      </Content>
    );
  }

  const loading = repoLoading || issuesLoading || countsLoading;
  const error = repoError || issuesError || countsError;

  if (loading) {
    return (
      <Content>
        <ContentHeader title="Security" />
        <Progress />
      </Content>
    );
  }

  if (error) {
    return (
      <Content>
        <ContentHeader title="Security" />
        <ResponseErrorPanel error={error} />
      </Content>
    );
  }

  if (!repository) {
    return (
      <Content>
        <ContentHeader title="Security">
          <SupportButton>
            View and manage security vulnerabilities detected by ZeroPath.
          </SupportButton>
        </ContentHeader>
        <EmptyState
          title="Repository not found"
          description="This repository is not connected to ZeroPath. Connect it in your ZeroPath dashboard to see security issues."
          missing="data"
        />
      </Content>
    );
  }

  const issues = data?.issues ?? [];
  const counts = severityCounts ?? { critical: 0, high: 0, medium: 0, low: 0, total: 0 };

  return (
    <Content>
      <ContentHeader title="Security">
        <SupportButton>
          View and manage security vulnerabilities detected by ZeroPath.
        </SupportButton>
      </ContentHeader>

      {/* Top Section: Info Card + Summary Cards (Vertical Layout) */}
      <Box className={classes.topSection}>
        <Grid container spacing={3}>
          {/* Info Card - Full width */}
          <Grid item xs={12}>
            <ZeroPathInfoCard repository={repository} />
          </Grid>

          {/* Security Issues Card - Full width */}
          <Grid item xs={12}>
            <ZeroPathSummaryCards
              repository={repository}
              severityCounts={counts}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Issues Table */}
      <Box className={classes.issuesSection}>
        {issues.length === 0 ? (
          <EmptyState
            title="No open issues - great job!"
            description="ZeroPath hasn't detected any open security issues in this repository. Keep up the good work!"
            missing="data"
          />
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
