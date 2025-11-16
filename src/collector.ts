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
  repositoryName?: string;
  name?: string;
  projectId?: string | number;
  issueCounts?: {
    open?: number;
  };
  isPrScanningEnabled?: boolean;
};

type ZeropathSecurityPosture = {
  severity?: {
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
  };
  exposure?: {
    oldestCriticalAge?: number;
    oldestHighAge?: number;
    oldestMediumAge?: number;
    oldestLowAge?: number;
  };
};

type SecurityPostureMap = Map<string, ZeropathSecurityPosture>;

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

    const projectIds = requiresPosture
      ? this.collectProjectIds(repositoryMap)
      : [];
    const securityPostureByProjectId = requiresPosture
      ? await this.fetchSecurityPosture(projectIds)
      : new Map<string, ZeropathSecurityPosture>();

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

      if (requiresPosture && repository.projectId !== undefined) {
        const posture = securityPostureByProjectId.get(
          String(repository.projectId),
        );
        if (!posture) {
          this.logger.debug(
            `[Zeropath] No security posture data for project ${repository.projectId}`,
          );
        } else {
          this.appendSeverityFacts({
            entityRef,
            factRefs,
            facts,
            posture,
            timestamp,
          });

          this.appendExposureFacts({
            entityRef,
            factRefs,
            facts,
            posture,
            timestamp,
          });
        }
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

  private collectProjectIds(
    repositoryMap: Map<string, ZeropathRepository>,
  ): string[] {
    const ids = new Set<string>();
    for (const repository of repositoryMap.values()) {
      if (repository.projectId === undefined || repository.projectId === null) {
        continue;
      }
      ids.add(String(repository.projectId));
    }
    return Array.from(ids);
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

  private async fetchSecurityPosture(
    projectIds: string[],
  ): Promise<SecurityPostureMap> {
    if (projectIds.length === 0) {
      return new Map();
    }

    const results = await Promise.all(
      projectIds.map(async projectId => {
        const payload = await this.post<Record<string, unknown>>(
          '/api/v1/stats/securityPosture',
          {
            organizationId: this.runtimeConfig!.organizationId,
            projectId,
          },
        );

        const source =
          Array.isArray(payload) && payload.length > 0 ? payload[0] : payload;

        if (!source || typeof source !== 'object') {
          throw new Error(
            `[Zeropath] Unexpected security posture payload for project ${projectId}`,
          );
        }

        const posture: ZeropathSecurityPosture = {};

        const repositoryRiskScores = this.extractRepositoryRiskScore(
          source,
          projectId,
        );
        if (repositoryRiskScores) {
          posture.severity = repositoryRiskScores;
        }

        const exposure = this.extractExposure(source);
        if (exposure) {
          posture.exposure = exposure;
        }

        return [projectId, posture] as const;
      }),
    );

    return new Map(results);
  }

  private extractRepositoryRiskScore(
    source: Record<string, unknown>,
    projectId: string,
  ):
    | {
        critical?: number;
        high?: number;
        medium?: number;
        low?: number;
      }
    | undefined {
    const riskScores = source.repositoryRiskScores;
    if (!Array.isArray(riskScores)) {
      return undefined;
    }

    const matchingScore = riskScores.find(it => {
      if (!it || typeof it !== 'object') {
        return false;
      }
      const candidate = (it as Record<string, unknown>).id;
      return String(candidate ?? '') === projectId;
    }) as Record<string, unknown> | undefined;

    if (!matchingScore) {
      return undefined;
    }

    const critical = this.asNumber(matchingScore.criticalIssues);
    const high = this.asNumber(matchingScore.highIssues);
    const medium = this.asNumber(matchingScore.mediumIssues);
    const low = this.asNumber(matchingScore.lowIssues);

    if (
      critical === undefined &&
      high === undefined &&
      medium === undefined &&
      low === undefined
    ) {
      return undefined;
    }

    return {
      critical,
      high,
      medium,
      low,
    };
  }

  private extractExposure(
    source: Record<string, unknown>,
  ):
    | {
        oldestCriticalAge?: number;
        oldestHighAge?: number;
        oldestMediumAge?: number;
        oldestLowAge?: number;
      }
    | undefined {
    const rawExposure = source.exposure;
    if (!rawExposure || typeof rawExposure !== 'object') {
      return undefined;
    }

    const exposureRecord = rawExposure as Record<string, unknown>;
    const oldestCriticalAge = this.asNumber(exposureRecord.oldestCriticalAge);
    const oldestHighAge = this.asNumber(exposureRecord.oldestHighAge);
    const oldestMediumAge = this.asNumber(exposureRecord.oldestMediumAge);
    const oldestLowAge = this.asNumber(exposureRecord.oldestLowAge);

    if (
      oldestCriticalAge === undefined &&
      oldestHighAge === undefined &&
      oldestMediumAge === undefined &&
      oldestLowAge === undefined
    ) {
      return undefined;
    }

    return {
      oldestCriticalAge,
      oldestHighAge,
      oldestMediumAge,
      oldestLowAge,
    };
  }

  private appendSeverityFacts(options: {
    facts: Fact[];
    factRefs: ReadonlyArray<string>;
    posture: ZeropathSecurityPosture;
    entityRef: string;
    timestamp: string;
  }): void {
    const { facts, factRefs, posture, entityRef, timestamp } = options;
    const severity = posture.severity;
    if (!severity) {
      return;
    }

    const add = (
      factRef: FactRefString,
      value: number | undefined,
    ): void => {
      if (!factRefs.includes(factRef)) {
        return;
      }
      if (typeof value !== 'number') {
        return;
      }
      facts.push({
        factRef,
        entityRef,
        data: { value },
        timestamp,
      });
    };

    add(FACT_REFS.ISSUES_CRITICAL_COUNT, severity.critical);
    add(FACT_REFS.ISSUES_HIGH_COUNT, severity.high);
    add(FACT_REFS.ISSUES_MEDIUM_COUNT, severity.medium);
    add(FACT_REFS.ISSUES_LOW_COUNT, severity.low);
  }

  private appendExposureFacts(options: {
    facts: Fact[];
    factRefs: ReadonlyArray<string>;
    posture: ZeropathSecurityPosture;
    entityRef: string;
    timestamp: string;
  }): void {
    const { facts, factRefs, posture, entityRef, timestamp } = options;
    const exposure = posture.exposure;
    if (!exposure) {
      return;
    }

    const add = (
      factRef: FactRefString,
      value: number | undefined,
    ): void => {
      if (!factRefs.includes(factRef)) {
        return;
      }
      if (typeof value !== 'number') {
        return;
      }
      facts.push({
        factRef,
        entityRef,
        data: { value },
        timestamp,
      });
    };

    add(FACT_REFS.OLDEST_CRITICAL_AGE, exposure.oldestCriticalAge);
    add(FACT_REFS.OLDEST_HIGH_AGE, exposure.oldestHighAge);
    add(FACT_REFS.OLDEST_MEDIUM_AGE, exposure.oldestMediumAge);
    add(FACT_REFS.OLDEST_LOW_AGE, exposure.oldestLowAge);
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
      throw new Error(
        `[Zeropath] Request to ${url} failed with status ${response.status}`,
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
