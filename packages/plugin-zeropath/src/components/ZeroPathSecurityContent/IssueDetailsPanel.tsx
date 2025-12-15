import React from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Link,
  makeStyles,
  Divider,
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import LaunchIcon from '@material-ui/icons/Launch';
import { ZeroPathIssue } from '../../api/types';
import { SeverityChip } from './SeverityChip';

const useStyles = makeStyles(theme => ({
  panel: {
    position: 'fixed',
    right: 0,
    top: 64,
    width: 480,
    height: 'calc(100vh - 64px)',
    zIndex: theme.zIndex.drawer,
    overflowY: 'auto',
    borderLeft: `1px solid ${theme.palette.divider}`,
  },
  header: {
    padding: theme.spacing(2),
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${theme.palette.divider}`,
    position: 'sticky',
    top: 0,
    backgroundColor: theme.palette.background.paper,
    zIndex: 1,
  },
  content: {
    padding: theme.spacing(2),
  },
  section: {
    marginBottom: theme.spacing(3),
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: theme.spacing(1),
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
    fontSize: '0.75rem',
    letterSpacing: '0.5px',
  },
  codeBlock: {
    backgroundColor: theme.palette.type === 'dark' ? '#1e1e1e' : '#f5f5f5',
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  chip: {
    marginRight: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
  },
  fileLink: {
    fontFamily: 'monospace',
    fontSize: '0.9rem',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  },
  metaLabel: {
    color: theme.palette.text.secondary,
  },
}));

interface IssueDetailsPanelProps {
  issue: ZeroPathIssue;
  onClose: () => void;
}

export const IssueDetailsPanel = ({ issue, onClose }: IssueDetailsPanelProps) => {
  const classes = useStyles();

  return (
    <Paper className={classes.panel} elevation={8}>
      <Box className={classes.header}>
        <Box>
          <Typography variant="h6">{issue.vulnClass}</Typography>
          <Box mt={1}>
            <SeverityChip score={issue.score} />
            <Chip
              label={issue.vulnCategory}
              size="small"
              variant="outlined"
              style={{ marginLeft: 8 }}
            />
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box className={classes.content}>
        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>Location</Typography>
          <Typography className={classes.fileLink}>
            {issue.affectedFile}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Lines {issue.startLine} - {issue.endLine}
          </Typography>
        </Box>

        {issue.cwes && issue.cwes.length > 0 && (
          <Box className={classes.section}>
            <Typography className={classes.sectionTitle}>CWE References</Typography>
            {issue.cwes.map(cwe => (
              <Chip
                key={cwe}
                label={cwe}
                size="small"
                className={classes.chip}
                component="a"
                href={`https://cwe.mitre.org/data/definitions/${cwe.replace('CWE-', '')}.html`}
                target="_blank"
                clickable
              />
            ))}
          </Box>
        )}

        {issue.sastCodeSegment && (
          <Box className={classes.section}>
            <Typography className={classes.sectionTitle}>Code Snippet</Typography>
            <Box className={classes.codeBlock}>{issue.sastCodeSegment}</Box>
          </Box>
        )}

        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>Details</Typography>
          <Box className={classes.metaRow}>
            <Typography className={classes.metaLabel}>Status</Typography>
            <Chip label={issue.status} size="small" />
          </Box>
          <Box className={classes.metaRow}>
            <Typography className={classes.metaLabel}>Language</Typography>
            <Typography>{issue.language}</Typography>
          </Box>
          <Box className={classes.metaRow}>
            <Typography className={classes.metaLabel}>Confidence</Typography>
            <Typography>{issue.confidence}%</Typography>
          </Box>
          <Box className={classes.metaRow}>
            <Typography className={classes.metaLabel}>Score</Typography>
            <Typography>{issue.score}</Typography>
          </Box>
          <Box className={classes.metaRow}>
            <Typography className={classes.metaLabel}>Created</Typography>
            <Typography>
              {new Date(issue.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>

        {issue.patch?.prLink && (
          <Box className={classes.section}>
            <Typography className={classes.sectionTitle}>Patch</Typography>
            <Link href={issue.patch.prLink} target="_blank" rel="noopener">
              View Pull Request <LaunchIcon fontSize="small" />
            </Link>
          </Box>
        )}

        <Divider />

        <Box mt={2}>
          <Link
            href={issue.url}
            target="_blank"
            rel="noopener"
            style={{ display: 'flex', alignItems: 'center' }}
          >
            View in ZeroPath Dashboard <LaunchIcon fontSize="small" style={{ marginLeft: 4 }} />
          </Link>
        </Box>
      </Box>
    </Paper>
  );
};
