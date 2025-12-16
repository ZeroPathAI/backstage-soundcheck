import {
  InfoCard,
  StructuredMetadataTable,
} from '@backstage/core-components';
import { Box, Chip, makeStyles } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CancelIcon from '@material-ui/icons/Cancel';
import { ZeroPathRepository } from '@internal/plugin-zeropath-common';

const useStyles = makeStyles(theme => ({
  enabledChip: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
  },
  disabledChip: {
    backgroundColor: theme.palette.grey[500],
    color: theme.palette.common.white,
  },
  icon: {
    fontSize: '1rem',
    marginRight: theme.spacing(0.5),
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
    <InfoCard title={repository.repositoryName || repository.name || 'Repository Info'}>
      <Box>
        <StructuredMetadataTable metadata={metadata} />
      </Box>
    </InfoCard>
  );
};
