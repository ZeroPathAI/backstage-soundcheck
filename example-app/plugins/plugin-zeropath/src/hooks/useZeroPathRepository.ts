import { useAsync } from 'react-use';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { zeroPathApiRef } from '../api/ZeroPathApi';
import {
  DEFAULT_REPOSITORY_ANNOTATION,
  formatSlug,
} from '@internal/plugin-zeropath-common';
import type { ZeroPathRepository } from '@internal/plugin-zeropath-common';

function getRepositorySlug(entity: Entity, annotationKey: string): string | undefined {
  return entity.metadata?.annotations?.[annotationKey];
}

export function useZeroPathRepository(entity: Entity) {
  const api = useApi(zeroPathApiRef);
  const configApi = useApi(configApiRef);

  // Allow configurable annotation key
  const annotationKey =
    configApi.getOptionalString('zeropath.repositoryAnnotation') ??
    DEFAULT_REPOSITORY_ANNOTATION;

  const entitySlug = getRepositorySlug(entity, annotationKey);

  const { value, loading, error } = useAsync(async () => {
    if (!entitySlug) return undefined;

    const formattedSlug = formatSlug(entitySlug);
    if (!formattedSlug) return undefined;

    const repositories = await api.listRepositories();

    return repositories.find(repo => {
      const repoSlug = formatSlug(repo.repositoryName || repo.name || '');
      if (!repoSlug) return false;
      return (
        repoSlug === formattedSlug ||
        repoSlug.endsWith(`/${formattedSlug}`) ||
        formattedSlug.endsWith(`/${repoSlug}`)
      );
    });
  }, [entitySlug, api]);

  return {
    repository: value as ZeroPathRepository | undefined,
    loading,
    error,
    missingAnnotation: !entitySlug,
  };
}
