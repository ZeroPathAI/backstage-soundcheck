// Plugin and components
export {
  zeroPathPlugin,
  ZeroPathSecurityCard,
  ZeroPathSecurityContent,
} from './plugin';

// API
export { zeroPathApiRef } from './api/ZeroPathApi';
export type { ZeroPathApi } from './api/ZeroPathApi';

// Conditions for EntitySwitch
export { isZeroPathAvailable } from './conditions';

// Re-export types from common package for convenience
export type {
  ZeroPathIssue,
  ZeroPathRepository,
  IssueCounts,
  SeverityLevel,
} from '@internal/plugin-zeropath-common';

export {
  SEVERITY_WINDOWS,
  mapScoreToSeverity,
  getSeverityColor,
  DEFAULT_REPOSITORY_ANNOTATION,
} from '@internal/plugin-zeropath-common';
