import { ConfigurableFactCollector } from '@spotify/backstage-plugin-soundcheck-node';
import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import {
  CollectionConfig,
  Fact,
  FactRef,
  stringifyFactRef,
} from '@spotify/backstage-plugin-soundcheck-common';
import { LoggerService } from '@backstage/backend-plugin-api';
import { JsonObject, JsonValue } from '@backstage/types';
import { Config, ConfigReader } from '@backstage/config';

const COLLECTOR_ID = 'zeropath';
const DEFAULT_SCOPE = 'default';
const DEFAULT_REPOSITORY_ANNOTATION = 'github.com/project-slug';

const FACT_NAMES = {
  IS_CONFIGURED: 'is_configured',
  ISSUES_COUNT: 'issues_count',
  PR_SCANNING_ENABLED: 'pr_scanning_enabled',
  ISSUES_CRITICAL_COUNT: 'issues_critical_count',
  ISSUES_HIGH_COUNT: 'issues_high_count',
  ISSUES_MEDIUM_COUNT: 'issues_medium_count',
  ISSUES_LOW_COUNT: 'issues_low_count',
  OLDEST_CRITICAL_AGE: 'oldest_critical_age',
  OLDEST_HIGH_AGE: 'oldest_high_age',
  OLDEST_MEDIUM_AGE: 'oldest_medium_age',
  OLDEST_LOW_AGE: 'oldest_low_age',
} as const;

const FACT_REFS = {
  IS_CONFIGURED: `${COLLECTOR_ID}:${DEFAULT_SCOPE}/${FACT_NAMES.IS_CONFIGURED}`,
  ISSUES_COUNT: `${COLLECTOR_ID}:${DEFAULT_SCOPE}/${FACT_NAMES.ISSUES_COUNT}`,
  PR_SCANNING_ENABLED: `${COLLECTOR_ID}:${DEFAULT_SCOPE}/${FACT_NAMES.PR_SCANNING_ENABLED}`,
  ISSUES_CRITICAL_COUNT: `${COLLECTOR_ID}:${DEFAULT_SCOPE}/${FACT_NAMES.ISSUES_CRITICAL_COUNT}`,
  ISSUES_HIGH_COUNT: `${COLLECTOR_ID}:${DEFAULT_SCOPE}/${FACT_NAMES.ISSUES_HIGH_COUNT}`,
  ISSUES_MEDIUM_COUNT: `${COLLECTOR_ID}:${DEFAULT_SCOPE}/${FACT_NAMES.ISSUES_MEDIUM_COUNT}`,
  ISSUES_LOW_COUNT: `${COLLECTOR_ID}:${DEFAULT_SCOPE}/${FACT_NAMES.ISSUES_LOW_COUNT}`,
  OLDEST_CRITICAL_AGE: `${COLLECTOR_ID}:${DEFAULT_SCOPE}/${FACT_NAMES.OLDEST_CRITICAL_AGE}`,
  OLDEST_HIGH_AGE: `${COLLECTOR_ID}:${DEFAULT_SCOPE}/${FACT_NAMES.OLDEST_HIGH_AGE}`,
  OLDEST_MEDIUM_AGE: `${COLLECTOR_ID}:${DEFAULT_SCOPE}/${FACT_NAMES.OLDEST_MEDIUM_AGE}`,
  OLDEST_LOW_AGE: `${COLLECTOR_ID}:${DEFAULT_SCOPE}/${FACT_NAMES.OLDEST_LOW_AGE}`,
} as const;

const DEFAULT_FACT_REFS = [
  FACT_REFS.IS_CONFIGURED,
  FACT_REFS.ISSUES_COUNT,
  FACT_REFS.PR_SCANNING_ENABLED,
  FACT_REFS.ISSUES_CRITICAL_COUNT,
  FACT_REFS.ISSUES_HIGH_COUNT,
  FACT_REFS.ISSUES_MEDIUM_COUNT,
  FACT_REFS.ISSUES_LOW_COUNT,
  FACT_REFS.OLDEST_CRITICAL_AGE,
  FACT_REFS.OLDEST_HIGH_AGE,
  FACT_REFS.OLDEST_MEDIUM_AGE,
  FACT_REFS.OLDEST_LOW_AGE,
] as const;

type FactRefString = (typeof DEFAULT_FACT_REFS)[number];

type ZeropathCollectorRuntimeConfig = {
  baseUrl: string;
  organizationId: string;
  tokenId: string;
  tokenSecret: string;
  repositorySlugAnnotation: string;
  repositorySlugPrefix?: string;
};

type ZeropathRepository = {
  id?: string | number;
  repositoryName?: string;
  name?: string;
  projectId?: string | number;
  issueCounts?: {
    open?: number;
  };
  isPrScanningEnabled?: boolean;
};

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

type SeverityWindow = {
  level: SeverityLevel;
  min: number;
  max: number;
};

type SeveritySnapshot = Record<
  SeverityLevel,
  {
    count: number;
    oldestAgeDays?: number;
  }
>;

type IssuesSearchResponse = {
  issues?: ZeropathIssue[];
};

type ZeropathIssue = {
  createdAt?: string;
  severity?: number | string;
  score?: number | string;
};

const SEVERITY_WINDOWS: SeverityWindow[] = [
  { level: 'critical', min: 90, max: 100 },
  { level: 'high', min: 70, max: 89 },
  { level: 'medium', min: 40, max: 69 },
  { level: 'low', min: 10, max: 39 },
];

export class ZeropathFactCollector implements ConfigurableFactCollector {
  public readonly id = COLLECTOR_ID;
  public readonly name = 'Zeropath';

  private readonly logger: LoggerService;
  private rawConfig?: JsonValue;
  private configReader?: ConfigReader;
  private runtimeConfig?: ZeropathCollectorRuntimeConfig;
  private collectConfigs: Config[] = [];

  private constructor(logger: LoggerService) {
    this.logger = logger.child({ target: this.id });
  }

  public static create(logger: LoggerService): ZeropathFactCollector {
    return new ZeropathFactCollector(logger);
  }

  async collect(
    entities: Entity[],
    params?: { factRefs?: FactRef[]; refresh?: FactRef[] },
  ): Promise<Fact[]> {
    if (!this.runtimeConfig) {
      throw new Error('[Zeropath] Collector has not been configured');
    }

    if (entities.length === 0) {
      return [];
    }

    const factRefs =
      params?.factRefs?.map(ref =>
        typeof ref === 'string' ? ref : stringifyFactRef(ref),
      ) ?? Array.from(DEFAULT_FACT_REFS);

    const requiresPosture = factRefs.some(ref =>
      this.requiresSecurityPosture(ref),
    );

    const repositories = await this.fetchRepositories();
    const repositoryMap = this.indexRepositories(repositories);
    const severitySnapshotCache = new Map<string, SeveritySnapshot>();

    const timestamp = new Date().toISOString();
    const facts: Fact[] = [];

    for (const entity of entities) {
      const entityRef = stringifyEntityRef(entity);
      const entitySlug = this.resolveEntityRepositorySlug(entity);

      if (!entitySlug) {
        this.logger.info(
          `[Zeropath] Entity ${entityRef} is missing the ${this.runtimeConfig.repositorySlugAnnotation} annotation`,
        );
        continue;
      }

      const repository = repositoryMap.get(entitySlug);
      const isConfigured = repository !== undefined;
      facts.push({
        factRef: FACT_REFS.IS_CONFIGURED,
        entityRef,
        data: { value: isConfigured },
        timestamp,
      });

      if (!repository) {
        continue;
      }

      if (factRefs.includes(FACT_REFS.ISSUES_COUNT)) {
        const open = repository.issueCounts?.open;
        if (typeof open === 'number') {
          facts.push({
            factRef: FACT_REFS.ISSUES_COUNT,
            entityRef,
            data: { value: open },
            timestamp,
          });
        }
      }

      if (factRefs.includes(FACT_REFS.PR_SCANNING_ENABLED)) {
        const enabled = repository.isPrScanningEnabled;
        if (typeof enabled === 'boolean') {
          facts.push({
            factRef: FACT_REFS.PR_SCANNING_ENABLED,
            entityRef,
            data: { value: enabled },
            timestamp,
          });
        }
      }

      if (requiresPosture) {
        const repositoryId = this.resolveRepositoryId(repository);
        if (repositoryId === undefined) {
          this.logger.warn(
            `[Zeropath] Repository ${entitySlug} for entity ${entityRef} is missing an identifier; unable to collect issue severity facts.`,
          );
          continue;
        }

        const cacheKey = this.toRepositoryKey(repositoryId);
        let snapshot = severitySnapshotCache.get(cacheKey);
        if (!snapshot) {
          snapshot = await this.fetchSeveritySnapshot(repositoryId);
          severitySnapshotCache.set(cacheKey, snapshot);
        }

        this.appendSeveritySnapshotFacts({
          entityRef,
          factRefs,
          facts,
          snapshot,
          timestamp,
        });
      }
    }

    return facts;
  }

  async getFactNames(): Promise<string[]> {
    return Object.values(FACT_NAMES);
  }

  async getDataSchema(factRef: FactRef): Promise<string | undefined> {
    const factString =
      typeof factRef === 'string' ? factRef : stringifyFactRef(factRef);

    if (factString === FACT_REFS.IS_CONFIGURED) {
      return JSON.stringify({
        title: 'Repository Linked',
        description: 'Whether the Zeropath collector can find a matching repository.',
        type: 'boolean',
      });
    }

    if (factString === FACT_REFS.ISSUES_COUNT) {
      return JSON.stringify({
        title: 'Open Issues',
        description: 'Total number of open Zeropath issues for the repository.',
        type: 'number',
      });
    }

    if (factString === FACT_REFS.PR_SCANNING_ENABLED) {
      return JSON.stringify({
        title: 'PR Scanning Enabled',
        description: 'Indicates if Zeropath PR scanning is enabled for the repository.',
        type: 'boolean',
      });
    }

    if (factString === FACT_REFS.ISSUES_CRITICAL_COUNT) {
      return JSON.stringify({
        title: 'Critical Issues',
        description: 'Number of critical severity issues reported by Zeropath.',
        type: 'number',
      });
    }

    if (factString === FACT_REFS.ISSUES_HIGH_COUNT) {
      return JSON.stringify({
        title: 'High Issues',
        description: 'Number of high severity issues reported by Zeropath.',
        type: 'number',
      });
    }

    if (factString === FACT_REFS.ISSUES_MEDIUM_COUNT) {
      return JSON.stringify({
        title: 'Medium Issues',
        description: 'Number of medium severity issues reported by Zeropath.',
        type: 'number',
      });
    }

    if (factString === FACT_REFS.ISSUES_LOW_COUNT) {
      return JSON.stringify({
        title: 'Low Issues',
        description: 'Number of low severity issues reported by Zeropath.',
        type: 'number',
      });
    }

    if (factString === FACT_REFS.OLDEST_CRITICAL_AGE) {
      return JSON.stringify({
        title: 'Oldest Critical Issue Age',
        description: 'Age in days of the oldest critical severity issue.',
        type: 'number',
      });
    }

    if (factString === FACT_REFS.OLDEST_HIGH_AGE) {
      return JSON.stringify({
        title: 'Oldest High Issue Age',
        description: 'Age in days of the oldest high severity issue.',
        type: 'number',
      });
    }

    if (factString === FACT_REFS.OLDEST_MEDIUM_AGE) {
      return JSON.stringify({
        title: 'Oldest Medium Issue Age',
        description: 'Age in days of the oldest medium severity issue.',
        type: 'number',
      });
    }

    if (factString === FACT_REFS.OLDEST_LOW_AGE) {
      return JSON.stringify({
        title: 'Oldest Low Issue Age',
        description: 'Age in days of the oldest low severity issue.',
        type: 'number',
      });
    }

    return undefined;
  }

  async getCollectionConfigs(): Promise<CollectionConfig[]> {
    if (!this.runtimeConfig || !this.configReader) {
      return [];
    }

    if (this.collectConfigs.length === 0) {
      return [];
    }

    return this.collectConfigs.map(collectConfig =>
      this.toCollectionConfig(collectConfig),
    );
  }

  async getConfig(): Promise<JsonValue | undefined> {
    return this.rawConfig;
  }

  async setConfig(config: JsonValue): Promise<void> {
    this.rawConfig = config;
    const reader = new ConfigReader(config as JsonObject);

    const baseUrl = this.withoutTrailingSlash(reader.getString('baseUrl'));
    const organizationId = reader.getString('organizationId');
    const tokenId = reader.getString('tokenId');
    const tokenSecret = reader.getString('tokenSecret');

    const repositorySlugAnnotation =
      reader.getOptionalString('repositorySlugAnnotation') ??
      DEFAULT_REPOSITORY_ANNOTATION;
    const repositorySlugPrefix = reader.getOptionalString(
      'repositorySlugPrefix',
    );

    this.runtimeConfig = {
      baseUrl,
      organizationId,
      tokenId,
      tokenSecret,
      repositorySlugAnnotation,
      repositorySlugPrefix,
    };

    this.configReader = reader;
    this.collectConfigs = reader.getOptionalConfigArray('collects') ?? [];
  }

  async getConfigSchema(): Promise<string> {
    return JSON.stringify({
      type: 'object',
      required: ['baseUrl', 'organizationId', 'tokenId', 'tokenSecret'],
      properties: {
        baseUrl: {
          type: 'string',
          format: 'uri',
        },
        organizationId: {
          type: 'string',
        },
        tokenId: {
          type: 'string',
        },
        tokenSecret: {
          type: 'string',
        },
        repositorySlugAnnotation: {
          type: 'string',
          default: DEFAULT_REPOSITORY_ANNOTATION,
        },
        repositorySlugPrefix: {
          type: 'string',
        },
        filter: {
          type: 'object',
        },
        exclude: {
          type: 'object',
        },
        frequency: {
          oneOf: [
            {
              type: 'object',
              properties: {
                cron: { type: 'string' },
              },
              required: ['cron'],
            },
            {
              type: 'object',
              properties: {
                hours: { type: 'number' },
                minutes: { type: 'number' },
                days: { type: 'number' },
              },
            },
          ],
        },
        initialDelay: {
          type: 'object',
          properties: {
            hours: { type: 'number' },
            minutes: { type: 'number' },
            days: { type: 'number' },
          },
        },
        batchSize: {
          type: 'number',
        },
        cache: {
          oneOf: [
            {
              type: 'object',
              properties: {
                duration: {
                  type: 'object',
                  properties: {
                    hours: { type: 'number' },
                    minutes: { type: 'number' },
                    days: { type: 'number' },
                  },
                },
              },
            },
            {
              type: 'boolean',
            },
          ],
        },
        collects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              filter: { type: 'object' },
              exclude: { type: 'object' },
              frequency: {
                oneOf: [
                  {
                    type: 'object',
                    properties: {
                      cron: { type: 'string' },
                    },
                    required: ['cron'],
                  },
                  {
                    type: 'object',
                    properties: {
                      hours: { type: 'number' },
                      minutes: { type: 'number' },
                      days: { type: 'number' },
                    },
                  },
                ],
              },
              initialDelay: {
                type: 'object',
                properties: {
                  hours: { type: 'number' },
                  minutes: { type: 'number' },
                  days: { type: 'number' },
                },
              },
              batchSize: {
                type: 'number',
              },
              cache: {
                oneOf: [
                  {
                    type: 'object',
                    properties: {
                      duration: {
                        type: 'object',
                        properties: {
                          hours: { type: 'number' },
                          minutes: { type: 'number' },
                          days: { type: 'number' },
                        },
                      },
                    },
                  },
                  {
                    type: 'boolean',
                  },
                ],
              },
            },
          },
        },
      },
    });
  }

  private requiresSecurityPosture(factRef: string): factRef is FactRefString {
    return (
      factRef === FACT_REFS.ISSUES_CRITICAL_COUNT ||
      factRef === FACT_REFS.ISSUES_HIGH_COUNT ||
      factRef === FACT_REFS.ISSUES_MEDIUM_COUNT ||
      factRef === FACT_REFS.ISSUES_LOW_COUNT ||
      factRef === FACT_REFS.OLDEST_CRITICAL_AGE ||
      factRef === FACT_REFS.OLDEST_HIGH_AGE ||
      factRef === FACT_REFS.OLDEST_MEDIUM_AGE ||
      factRef === FACT_REFS.OLDEST_LOW_AGE
    );
  }

  private indexRepositories(repositories: ZeropathRepository[]): Map<string, ZeropathRepository> {
    const map = new Map<string, ZeropathRepository>();

    for (const repository of repositories) {
      const slug = this.formatSlug(
        repository.repositoryName ?? repository.name ?? '',
      );
      if (!slug) {
        continue;
      }
      map.set(slug, repository);
    }

    return map;
  }

  private async fetchRepositories(): Promise<ZeropathRepository[]> {
    if (!this.runtimeConfig) {
      throw new Error('[Zeropath] Collector has not been configured');
    }

    const response = await this.post<
      ZeropathRepository[]
    >('/api/v1/repositories/list', {
      organizationId: this.runtimeConfig.organizationId,
    });

    if (!Array.isArray(response)) {
      throw new Error('[Zeropath] Repository list response is not an array');
    }

    return response;
  }

  private async fetchSeveritySnapshot(
    repositoryId: string | number,
  ): Promise<SeveritySnapshot> {
    const summary: SeveritySnapshot = {
      critical: { count: 0 },
      high: { count: 0 },
      medium: { count: 0 },
      low: { count: 0 },
    };
    const issues = await this.fetchIssues(repositoryId);

    for (const issue of issues) {
      const severityValue = this.asNumber(issue.score);
      const severityLevel = this.mapSeverityScoreToLevel(severityValue);
      if (!severityLevel) {
        this.logger.warn('[Zeropath] Issue severity unclassified', {
          repositoryId: this.toRepositoryKey(repositoryId),
          issue: {
            createdAt: issue.createdAt,
            score: issue.score,
          },
        });
        continue;
      }

      const stats = summary[severityLevel];
      stats.count += 1;

      const age = issue.createdAt
        ? this.calculateAgeInDays(issue.createdAt)
        : undefined;
      if (
        typeof age === 'number' &&
        (stats.oldestAgeDays === undefined || age > stats.oldestAgeDays)
      ) {
        stats.oldestAgeDays = age;
      }
    }

    this.logger.info('[Zeropath] Computed severity snapshot', {
      repositoryId: this.toRepositoryKey(repositoryId),
      summary,
    });

    return summary;
  }

  private async fetchIssues(
    repositoryId: string | number,
  ): Promise<ZeropathIssue[]> {
    if (!this.runtimeConfig) {
      throw new Error('[Zeropath] Collector has not been configured');
    }

    const response = await this.post<IssuesSearchResponse>(
      '/api/v1/issues/search',
      {
        organizationId: this.runtimeConfig.organizationId,
        repositoryIds: [this.toRepositoryKey(repositoryId)],
        types: ['open'],
        returnAll: true,
        getCounts: false,
        page: 1,
        pageSize: 200,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      },
    );

    const issues = Array.isArray(response.issues) ? response.issues : [];

    this.logger.info('[Zeropath] Retrieved issues payload', {
      repositoryId: this.toRepositoryKey(repositoryId),
      issueCount: issues.length,
      sample: issues.slice(0, 5).map(issue => ({
        createdAt: issue.createdAt,
        severity: issue.severity,
      })),
    });

    return issues;
  }

  private mapSeverityScoreToLevel(
    score: number | undefined,
  ): SeverityLevel | undefined {
    if (score === undefined || Number.isNaN(score)) {
      return undefined;
    }

    for (const window of SEVERITY_WINDOWS) {
      if (score >= window.min && score <= window.max) {
        return window.level;
      }
    }

    this.logger.debug('[Zeropath] Score outside severity windows', { score });
    return undefined;
  }

  private appendSeveritySnapshotFacts(options: {
    facts: Fact[];
    factRefs: ReadonlyArray<string>;
    snapshot: SeveritySnapshot;
    entityRef: string;
    timestamp: string;
  }): void {
    const { facts, factRefs, snapshot, entityRef, timestamp } = options;

    const config: Record<
      SeverityLevel,
      { countRef: FactRefString; ageRef: FactRefString }
    > = {
      critical: {
        countRef: FACT_REFS.ISSUES_CRITICAL_COUNT,
        ageRef: FACT_REFS.OLDEST_CRITICAL_AGE,
      },
      high: {
        countRef: FACT_REFS.ISSUES_HIGH_COUNT,
        ageRef: FACT_REFS.OLDEST_HIGH_AGE,
      },
      medium: {
        countRef: FACT_REFS.ISSUES_MEDIUM_COUNT,
        ageRef: FACT_REFS.OLDEST_MEDIUM_AGE,
      },
      low: {
        countRef: FACT_REFS.ISSUES_LOW_COUNT,
        ageRef: FACT_REFS.OLDEST_LOW_AGE,
      },
    };

    for (const window of SEVERITY_WINDOWS) {
      const stats = snapshot[window.level];
      const { countRef, ageRef } = config[window.level];

      if (factRefs.includes(countRef)) {
        facts.push({
          factRef: countRef,
          entityRef,
          data: { value: stats.count },
          timestamp,
        });
      }

      if (
        factRefs.includes(ageRef) &&
        typeof stats.oldestAgeDays === 'number'
      ) {
        facts.push({
          factRef: ageRef,
          entityRef,
          data: { value: stats.oldestAgeDays },
          timestamp,
        });
      }
    }
  }

  private resolveRepositoryId(
    repository: ZeropathRepository,
  ): string | number | undefined {
    return repository.id;
  }

  private toRepositoryKey(repositoryId: string | number): string {
    return typeof repositoryId === 'string' ? repositoryId : String(repositoryId);
  }

  private calculateAgeInDays(createdAt: string): number | undefined {
    const timestamp = Date.parse(createdAt);
    if (Number.isNaN(timestamp)) {
      return undefined;
    }
    const diffMs = Date.now() - timestamp;
    if (diffMs < 0) {
      return 0;
    }
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    if (!this.runtimeConfig) {
      throw new Error('[Zeropath] Collector has not been configured');
    }

    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ZeroPath-API-Token-Id': this.runtimeConfig.tokenId,
        'X-ZeroPath-API-Token-Secret': this.runtimeConfig.tokenSecret,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let details: string | undefined;
      try {
        details = await response.text();
      } catch (error) {
        this.logger.debug('[Zeropath] Failed to read error response body', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      const suffix = details && details.trim().length > 0 ? `: ${details}` : '';
      throw new Error(
        `[Zeropath] Request to ${url} failed with status ${response.status}${suffix}`,
      );
    }

    return (await response.json()) as T;
  }

  private buildUrl(path: string): string {
    const base = this.runtimeConfig!.baseUrl;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private withoutTrailingSlash(value: string): string {
    return value.endsWith('/') ? value.slice(0, -1) : value;
  }

  private formatSlug(value: string): string | undefined {
    const trimmed = value.trim().replace(/\.git$/i, '');
    if (!trimmed) {
      return undefined;
    }
    if (trimmed.includes('/')) {
      return trimmed;
    }
    if (!this.runtimeConfig?.repositorySlugPrefix) {
      return trimmed;
    }
    return `${this.runtimeConfig.repositorySlugPrefix}/${trimmed}`;
  }

  private resolveEntityRepositorySlug(entity: Entity): string | undefined {
    if (!this.runtimeConfig) {
      throw new Error('[Zeropath] Collector has not been configured');
    }

    const annotations = entity.metadata?.annotations;
    if (!annotations) {
      return undefined;
    }

    const slug = annotations[this.runtimeConfig.repositorySlugAnnotation];
    if (typeof slug !== 'string') {
      return undefined;
    }

    return this.formatSlug(slug);
  }

  private asNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  private toCollectionConfig(source: Config): CollectionConfig {
    const fallback = this.configReader!;
    return {
      factRefs: Array.from(DEFAULT_FACT_REFS),
      filter: source.getOptional('filter') ?? fallback.getOptional('filter'),
      exclude: source.getOptional('exclude') ?? fallback.getOptional('exclude'),
      frequency:
        source.getOptional('frequency') ?? fallback.getOptional('frequency'),
      initialDelay:
        source.getOptional('initialDelay') ??
        fallback.getOptional('initialDelay'),
      batchSize:
        source.getOptionalNumber('batchSize') ??
        fallback.getOptionalNumber('batchSize'),
      cache: source.getOptional('cache') ?? fallback.getOptional('cache'),
    };
  }
}
