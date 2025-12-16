// Re-export types from common package
export type {
  SeverityLevel,
  ZeroPathIssue,
  ZeroPathRepository,
  IssueCounts,
  IssueSearchResponse,
} from '@internal/plugin-zeropath-common';

export {
  SEVERITY_WINDOWS,
  mapScoreToSeverity,
  getSeverityColor,
} from '@internal/plugin-zeropath-common';
