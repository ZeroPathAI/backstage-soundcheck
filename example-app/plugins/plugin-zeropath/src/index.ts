// Plugin and components
export {
  zeroPathPlugin,
  ZeroPathSecurityContent,
} from './plugin';

// API
export { zeroPathApiRef } from './api/ZeroPathApi';
export type { ZeroPathApi } from './api/ZeroPathApi';

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
} from '@internal/plugin-zeropath-common';
