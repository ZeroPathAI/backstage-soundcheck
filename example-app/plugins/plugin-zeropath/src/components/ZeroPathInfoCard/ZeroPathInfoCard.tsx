import {
  InfoCard,
  StructuredMetadataTable,
} from '@backstage/core-components';
import { Box, Chip, Typography, makeStyles } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CancelIcon from '@material-ui/icons/Cancel';
import InfoIcon from '@material-ui/icons/Info';
import { ZeroPathRepository } from '@internal/plugin-zeropath-common';

const useStyles = makeStyles(theme => ({
  enabledChip: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
    fontWeight: 600,
  },
  disabledChip: {
    backgroundColor: theme.palette.grey[400],
    color: theme.palette.common.white,
    fontWeight: 600,
  },
  icon: {
    fontSize: '1rem',
  },
  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  metadataWrapper: {
    '& table': {
      '& td': {
        padding: theme.spacing(1.5, 2),
        borderBottom: `1px solid ${theme.palette.divider}`,
      },
      '& tr:last-child td': {
        borderBottom: 'none',
      },
    },
  },
}));

interface ZeroPathInfoCardProps {
  repository: ZeroPathRepository;
}

export const ZeroPathInfoCard = ({ repository }: ZeroPathInfoCardProps) => {
  const classes = useStyles();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const PrScanningStatus = () => (
    <Chip
      size="small"
      icon={
        repository.isPrScanningEnabled ? (
          <CheckCircleIcon className={classes.icon} />
        ) : (
          <CancelIcon className={classes.icon} />
        )
      }
      label={repository.isPrScanningEnabled ? 'Enabled' : 'Disabled'}
      className={
        repository.isPrScanningEnabled
          ? classes.enabledChip
          : classes.disabledChip
      }
    />
  );

  const metadata: Record<string, React.ReactNode> = {
    'Repository': repository.repositoryName || repository.name || 'Unknown',
    'PR Scanning': <PrScanningStatus />,
    'Scan Branch': repository.defaultScanTargetBranch || 'default',
    'Validation Threshold': repository.validationThresholdName || 'Not set',
    'Last Scanned': formatDate(repository.lastScannedAt),
    'Repository ID': String(repository.id),
  };

  if (repository.projectId) {
    metadata['Project ID'] = String(repository.projectId);
  }

  return (
    <InfoCard
      title={
        <Box className={classes.titleWrapper}>
          <InfoIcon className={classes.titleIcon} />
          <Typography variant="h6">Repository Info</Typography>
        </Box>
      }
    >
      <Box className={classes.metadataWrapper}>
        <StructuredMetadataTable metadata={metadata} />
      </Box>
    </InfoCard>
  );
};
