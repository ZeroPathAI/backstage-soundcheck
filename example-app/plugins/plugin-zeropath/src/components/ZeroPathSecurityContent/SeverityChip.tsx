import { Chip, makeStyles } from '@material-ui/core';
import { mapScoreToSeverity, getSeverityColor } from '../../api/types';

const useStyles = makeStyles(() => ({
  chip: {
    fontWeight: 'bold',
    color: '#fff',
  },
}));

interface SeverityChipProps {
  score: number;
  size?: 'small' | 'medium';
}

export const SeverityChip = ({ score, size = 'small' }: SeverityChipProps) => {
  const classes = useStyles();
  const severity = mapScoreToSeverity(score);
  const label = severity
    ? severity.charAt(0).toUpperCase() + severity.slice(1)
    : 'Unknown';
  const color = severity ? getSeverityColor(severity) : '#757575';

  return (
    <Chip
      label={label}
      size={size}
      className={classes.chip}
      style={{ backgroundColor: color }}
    />
  );
};
