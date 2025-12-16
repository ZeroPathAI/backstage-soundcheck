import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { Entity } from '@backstage/catalog-model';
import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import {
  ZeroPathRepository,
  DEFAULT_REPOSITORY_ANNOTATION,
  formatSlug,
} from '@internal/plugin-zeropath-common';

/**
 * Options for creating a ZeroPathEntityProvider
 */
export interface ZeroPathEntityProviderOptions {
  logger: LoggerService;
  baseUrl: string;
  organizationId: string;
  tokenId: string;
  tokenSecret: string;
  defaultOwner: string;
  defaultSystem?: string;
}

/**
 * EntityProvider that fetches repositories from ZeroPath and creates
 * Component entities in the Backstage catalog.
 */
export class ZeroPathEntityProvider implements EntityProvider {
  private readonly logger: LoggerService;
  private readonly baseUrl: string;
  private readonly organizationId: string;
  private readonly tokenId: string;
  private readonly tokenSecret: string;
  private readonly defaultOwner: string;
  private readonly defaultSystem?: string;
  private connection?: EntityProviderConnection;

  /**
   * Creates a ZeroPathEntityProvider from configuration
   */
  static fromConfig(
    config: Config,
    options: { logger: LoggerService },
  ): ZeroPathEntityProvider {
    const zeropathConfig = config.getConfig('zeropath');
    return new ZeroPathEntityProvider({
      logger: options.logger,
      baseUrl: zeropathConfig.getString('baseUrl'),
      organizationId: zeropathConfig.getString('organizationId'),
      tokenId: zeropathConfig.getString('tokenId'),
      tokenSecret: zeropathConfig.getString('tokenSecret'),
      defaultOwner:
        zeropathConfig.getOptionalString('defaultOwner') ??
        'group:default/team-platform',
      defaultSystem: zeropathConfig.getOptionalString('defaultSystem'),
    });
  }

  constructor(options: ZeroPathEntityProviderOptions) {
    this.logger = options.logger.child({ target: 'zeropath-entity-provider' });
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.organizationId = options.organizationId;
    this.tokenId = options.tokenId;
    this.tokenSecret = options.tokenSecret;
    this.defaultOwner = options.defaultOwner;
    this.defaultSystem = options.defaultSystem;
  }

  getProviderName(): string {
    return 'zeropath';
  }

  async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;
    this.logger.info('ZeroPath entity provider connected');
  }

  /**
   * Refreshes the catalog by fetching repositories from ZeroPath
   * and creating/updating entities
   */
  async run(): Promise<void> {
    if (!this.connection) {
      throw new Error('ZeroPath entity provider not connected');
    }

    this.logger.info('Refreshing ZeroPath repositories');

    try {
      const repositories = await this.fetchRepositories();
      const entities = repositories
        .map(repo => this.toEntity(repo))
        .filter((e): e is Entity => e !== null);

      this.logger.info(
        `Found ${repositories.length} repositories, created ${entities.length} entities`,
      );

      await this.connection.applyMutation({
        type: 'full',
        entities: entities.map(entity => ({
          entity,
          locationKey: 'zeropath-entity-provider',
        })),
      });

      this.logger.info('ZeroPath entities refreshed successfully');
    } catch (error) {
      this.logger.error(
        `Failed to refresh ZeroPath entities: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Fetches repositories from the ZeroPath API
   */
  private async fetchRepositories(): Promise<ZeroPathRepository[]> {
    const url = `${this.baseUrl}/api/v1/repositories/list`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ZeroPath-API-Token-Id': this.tokenId,
        'X-ZeroPath-API-Token-Secret': this.tokenSecret,
      },
      body: JSON.stringify({ organizationId: this.organizationId }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ZeroPath API error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  /**
   * Converts a ZeroPath repository to a Backstage Component entity
   */
  private toEntity(repo: ZeroPathRepository): Entity | null {
    const repoSlug = repo.repositoryName ?? repo.name;
    if (!repoSlug) {
      this.logger.warn(`Repository ${repo.id} has no name, skipping`);
      return null;
    }

    const formattedSlug = formatSlug(repoSlug);
    if (!formattedSlug) {
      this.logger.warn(`Repository ${repo.id} has invalid slug, skipping`);
      return null;
    }

    // Create a valid Backstage entity name (lowercase, alphanumeric with dashes)
    const entityName = formattedSlug
      .toLowerCase()
      .replace(/\//g, '-')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!entityName) {
      this.logger.warn(
        `Repository ${repo.id} produced empty entity name, skipping`,
      );
      return null;
    }

    // Extract repo name for title (part after the slash)
    const parts = formattedSlug.split('/');
    const title = parts.length > 1 ? parts[parts.length - 1] : formattedSlug;

    // Collect tags from repository if available
    const tags: string[] = [];
    if (repo.tags && Array.isArray(repo.tags)) {
      tags.push(...repo.tags);
    }

    return {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: entityName,
        title: title,
        description: `Security-scanned repository: ${formattedSlug}`,
        annotations: {
          [DEFAULT_REPOSITORY_ANNOTATION]: formattedSlug,
          'zeropath.io/repository-id': String(repo.id),
          'backstage.io/managed-by-location':
            'url:zeropath-entity-provider',
          'backstage.io/managed-by-origin-location':
            'url:zeropath-entity-provider',
        },
        tags: tags.length > 0 ? tags : undefined,
        links:
          repo.url && repo.url.length > 10 && repo.url !== 'https://'
            ? [
                {
                  url: repo.url,
                  title: 'Repository',
                },
              ]
            : undefined,
      },
      spec: {
        type: 'service',
        lifecycle: 'production',
        owner: this.defaultOwner,
        ...(this.defaultSystem && { system: this.defaultSystem }),
      },
    };
  }
}
