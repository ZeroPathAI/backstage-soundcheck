/**
 * Severity levels for ZeroPath issues
 */
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

/**
 * ZeroPath repository representation
 */
export interface ZeroPathRepository {
  id: string | number;
  repositoryName?: string;
  name?: string;
  projectId?: string | number;
  issueCounts?: {
    open?: number;
    newOpen?: number;
    processing?: number;
    patched?: number;
    archived?: number;
    falsePositive?: number;
    patchable?: number;
    closed?: number;
  };
  isPrScanningEnabled?: boolean;
}

/**
 * ZeroPath issue representation
 */
export interface ZeroPathIssue {
  id: string;
  repositoryId: string;
  repositoryName?: string;
  vulnClass?: string;
  cwes?: string[];
  vulnCategory?: 'SAST' | 'SCA' | 'IAC' | 'SECRETS' | 'SMART_CONTRACT' | 'EOL';
  language?: string;
  severity?: number;
  confidence?: number;
  score: number;
  affectedFile?: string;
  startLine?: number;
  endLine?: number;
  startColumn?: number;
  endColumn?: number;
  sastCodeSegment?: string;
  status: 'open' | 'patched' | 'falsePositive' | 'notExploitable' | 'archived' | 'processing' | 'silenced';
  triagePhase?: string;
  validated?: 'CONFIRMED' | 'DISCONFIRMED' | 'UNKNOWN' | null;
  createdAt: string;
  updatedAt?: string;
  url?: string;
  generatedTitle?: string;
  generatedDescription?: string;
  patch?: {
    prLink?: string;
    gitDiff?: string;
    pullRequestStatus?: string;
  };
}

/**
 * Issue counts by severity level
 */
export interface IssueCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

/**
 * Response from the ZeroPath issues search API
 */
export interface IssueSearchResponse {
  issues: ZeroPathIssue[];
  totalCount?: number;
  categoryCounts?: {
    open?: number;
    patched?: number;
    falsePositive?: number;
    notExploitable?: number;
    archived?: number;
  };
}

/**
 * Severity snapshot for a repository (used by Soundcheck collector)
 */
export type SeveritySnapshot = Record<
  SeverityLevel,
  {
    count: number;
    oldestAgeDays?: number;
  }
>;
