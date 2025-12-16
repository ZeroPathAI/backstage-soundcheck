import { DiscoveryApi, FetchApi, ConfigApi } from '@backstage/core-plugin-api';
import { ZeroPathApi } from './ZeroPathApi';
import {
  ZeroPathIssue,
  ZeroPathRepository,
  IssueCounts,
  IssueSearchResponse,
  mapScoreToSeverity,
} from './types';

export class ZeroPathClient implements ZeroPathApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;
  private readonly configApi: ConfigApi;

  constructor(options: {
    discoveryApi: DiscoveryApi;
    fetchApi: FetchApi;
    configApi: ConfigApi;
  }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
    this.configApi = options.configApi;
  }

  private getOrganizationId(): string {
    return this.configApi.getString('zeropath.organizationId');
  }

  private async fetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const proxyUrl = await this.discoveryApi.getBaseUrl('proxy');
    const organizationId = this.getOrganizationId();

    const response = await this.fetchApi.fetch(`${proxyUrl}/zeropath${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId,
        ...body,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ZeroPath API error: ${response.status} ${text}`);
    }

    const data = await response.json();
    console.log('[ZeroPath API] Response from', path, ':', JSON.stringify(data, null, 2));
    return data;
  }

  async listRepositories(): Promise<ZeroPathRepository[]> {
    const response = await this.fetch<ZeroPathRepository[]>(
      '/api/v1/repositories/list',
      {},
    );
    return Array.isArray(response) ? response : [];
  }

  async searchIssues(
    repositoryId: string,
    options?: {
      status?: string[];
      page?: number;
      pageSize?: number;
    },
  ): Promise<{ issues: ZeroPathIssue[]; total: number }> {
    const response = await this.fetch<IssueSearchResponse>(
      '/api/v1/issues/search',
      {
        repositoryIds: [repositoryId],
        types: options?.status ?? ['open'],
        returnAll: false,
        getCounts: true,
        page: options?.page ?? 1,
        pageSize: options?.pageSize ?? 50,
        sortBy: 'score',
        sortOrder: 'desc',
      },
    );

    return {
      issues: response.issues ?? [],
      total: response.totalCount ?? response.issues?.length ?? 0,
    };
  }

  async getIssue(issueId: string): Promise<ZeroPathIssue> {
    const response = await this.fetch<ZeroPathIssue>(
      '/api/v1/issues/get',
      { issueId },
    );
    return response;
  }

  async getIssueCounts(repositoryId: string): Promise<IssueCounts> {
    const { issues } = await this.searchIssues(repositoryId, {
      status: ['open'],
      pageSize: 500,
    });

    const counts: IssueCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: 0,
    };

    for (const issue of issues) {
      const severity = mapScoreToSeverity(issue.score);
      if (severity) {
        counts[severity]++;
        counts.total++;
      }
    }

    return counts;
  }
}
