// Re-export types from common package
export type {
  SeverityLevel,
  ZeroPathIssue,
  ZeroPathRepository,
  IssueCounts,
  IssueSearchResponse,
} from '@zeropath/backstage-plugin-zeropath-common';

export {
  SEVERITY_WINDOWS,
  mapScoreToSeverity,
  getSeverityColor,
} from '@zeropath/backstage-plugin-zeropath-common';
