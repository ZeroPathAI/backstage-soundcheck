import { HumanDuration } from '@backstage/types';
import { EntityFilter } from '@spotify/backstage-plugin-soundcheck-common';

export interface Config {
  soundcheck?: {
    collectors?: {
      zeropath?: {
        /**
         * Base URL for the Zeropath API, e.g. https://zeropath.com or https://customer.zeropath.com.
         *
         * @visibility backend
         */
        baseUrl: string;
        /**
         * Zeropath organization identifier used when listing repositories and fetching posture data.
         *
         * @visibility backend
         */
        organizationId: string;
        /**
         * Zeropath API token identifier.
         *
         * @visibility secret
         */
        tokenId: string;
        /**
         * Zeropath API token secret.
         *
         * @visibility secret
         */
        tokenSecret: string;
        /**
         * Annotation key that contains the repository slug on catalog entities.
         *
         * @default "github.com/project-slug"
         * @visibility backend
         */
        repositorySlugAnnotation?: string;
        /**
         * Optional namespace that should be prefixed to repository names returned by the Zeropath API
         * when they are missing an organization/user qualifier.
         *
         * @visibility backend
         */
        repositorySlugPrefix?: string;
        frequency?:
          | {
              cron: string;
            }
          | HumanDuration;
        initialDelay?: HumanDuration;
        batchSize?: number;
        filter?: EntityFilter;
        exclude?: EntityFilter;
        cache?:
          | {
              duration: HumanDuration;
            }
          | boolean;
        collects?: {
          frequency?:
            | {
                cron: string;
              }
            | HumanDuration;
          initialDelay?: HumanDuration;
          batchSize?: number;
          filter?: EntityFilter;
          exclude?: EntityFilter;
          cache?:
            | {
                duration: HumanDuration;
              }
            | boolean;
        }[];
      };
    };
  };
}
