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
  url?: string;
  repositoryUrl?: string;
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
  isPrScanSummaryEnabled?: boolean;
  isVulnInfoInPRComment?: boolean;
  showCheckStatus?: boolean;
  isAutoGeneratePr?: boolean;
  isAutoGeneratePrForPrScan?: boolean;
  isAutoEnablePatchGenerationFullScan?: boolean;
  isEnableNaturalLanguageCodeModificationPr?: boolean;
  defaultScanTargetBranch?: string;
  validationThreshold?: number;
  validationThresholdName?: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  patchScoreThreshold?: number;
  prGenerationFullScanThreshold?: number;
  patchFullScanThreshold?: number;
  prStatusThreshold?: number;
  maxPrTimeoutMinutes?: number;
  prScanIssuePrPatchGenerationThreshold?: number;
  prScanIssuePrGenerationThreshold?: number;
  prBranchFormat?: string | null;
  prCommitMessageFormat?: string | null;
  prTitleTemplate?: string | null;
  prDescriptionTemplate?: string | null;
  enabledSourceTypes?: string[];
  enabledFullScanScannerTools?: string[];
  enabledPrScanScannerTools?: string[];
  cweWhitelist?: string[];
  tags?: string[];
  confidencePermissiveness?: string;
  createdAt?: string;
  lastScannedAt?: string;
  github?: {
    externalGithubRepositoryId?: string;
    githubAppInstallationId?: string;
    externalGithubAppInstallationId?: string;
    linkActive?: boolean;
    patLink?: boolean;
  };
  genericGit?: {
    repositoryUrl?: string;
    linkActive?: boolean;
  };
  scanSchedule?: {
    id?: string;
    executionCriteriaCrontab?: string;
    isEnabled?: boolean;
    scannerSettingId?: string;
    scanBranch?: string;
    createdAt?: string;
    updatedAt?: string;
  };
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
  totalCountAllCategories?: number;
  currentPage?: number;
  pageSize?: number;
  categoryCounts?: {
    open?: number;
    patched?: number;
    falsePositive?: number;
    notExploitable?: number;
    archived?: number;
    processing?: number;
    silenced?: number;
    closed?: number;
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
