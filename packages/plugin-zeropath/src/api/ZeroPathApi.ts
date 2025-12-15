import { createApiRef } from '@backstage/core-plugin-api';
import { ZeroPathIssue, ZeroPathRepository, IssueCounts } from './types';

export interface ZeroPathApi {
  listRepositories(): Promise<ZeroPathRepository[]>;

  searchIssues(
    repositoryId: string,
    options?: {
      status?: string[];
      page?: number;
      pageSize?: number;
    },
  ): Promise<{ issues: ZeroPathIssue[]; total: number }>;

  getIssue(issueId: string): Promise<ZeroPathIssue>;

  getIssueCounts(repositoryId: string): Promise<IssueCounts>;
}

export const zeroPathApiRef = createApiRef<ZeroPathApi>({
  id: 'plugin.zeropath.api',
});
