import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { useAsync } from 'react-use';
import {
  Progress,
  ResponseErrorPanel,
  EmptyState,
  InfoCard,
} from '@backstage/core-components';
import { Box, Typography } from '@material-ui/core';
import { zeroPathApiRef } from '../api/ZeroPathApi';
import { ZeroPathInfoCard } from './ZeroPathInfoCard';
import { ZeroPathSummaryCards } from './ZeroPathSummaryCards';
import { ZeroPathRepository } from '@internal/plugin-zeropath-common';

const DEFAULT_ANNOTATION = 'github.com/project-slug';

/**
 * Custom hook to get the repository from the current entity context
 */
function useEntityRepository() {
  const { entity } = useEntity();
  const api = useApi(zeroPathApiRef);
  const configApi = useApi(configApiRef);

  const annotationKey =
    configApi.getOptionalString('zeropath.repositoryAnnotation') ??
    DEFAULT_ANNOTATION;

  const { value, loading, error } = useAsync(async () => {
    // Get repository slug from entity annotation
    const repoSlug = entity.metadata.annotations?.[annotationKey];

    if (!repoSlug) {
      return null;
    }

    // Fetch all repositories and match by name
    const repos = await api.listRepositories();
    const matchedRepo = repos.find(
      (r: ZeroPathRepository) =>
        r.repositoryName === repoSlug ||
        r.name === repoSlug ||
        r.repositoryName?.toLowerCase() === repoSlug.toLowerCase() ||
        r.name?.toLowerCase() === repoSlug.toLowerCase(),
    );

    return matchedRepo ?? null;
  }, [annotationKey, entity, api]);

  return { repository: value, loading, error };
}

/**
 * Entity-aware wrapper for ZeroPathInfoCard
 * Gets the repository from entity context and renders the info card
 */
export const ZeroPathInfoCardWrapper = () => {
  const { repository, loading, error } = useEntityRepository();

  if (loading) {
    return (
      <InfoCard title="Repository Info">
        <Progress />
      </InfoCard>
    );
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  if (!repository) {
    return (
      <InfoCard title="Repository Info">
        <Box p={2}>
          <EmptyState
            title="Repository not found"
            description="No ZeroPath repository matched this entity. Ensure the entity has a valid repository annotation."
            missing="data"
          />
        </Box>
      </InfoCard>
    );
  }

  return <ZeroPathInfoCard repository={repository} />;
};

/**
 * Entity-aware wrapper for ZeroPathSummaryCards
 * Gets the repository and severity counts from entity context
 */
export const ZeroPathSummaryCardsWrapper = () => {
  const { repository, loading: repoLoading, error: repoError } = useEntityRepository();
  const api = useApi(zeroPathApiRef);

  // Fetch severity counts and issues when repository is available
  const {
    value: data,
    loading: dataLoading,
    error: dataError,
  } = useAsync(async () => {
    if (!repository) {
      return {
        severityCounts: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
        issues: [],
      };
    }

    const [counts, searchResult] = await Promise.all([
      api.getIssueCounts(String(repository.id)),
      api.searchIssues(String(repository.id), { status: ['open'] }),
    ]);

    return {
      severityCounts: counts,
      issues: searchResult.issues,
    };
  }, [repository, api]);

  const loading = repoLoading || dataLoading;
  const error = repoError || dataError;

  if (loading) {
    return (
      <InfoCard title="Vulnerabilities">
        <Progress />
      </InfoCard>
    );
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  if (!repository) {
    return (
      <InfoCard title="Vulnerabilities">
        <Box p={2}>
          <Typography color="textSecondary">
            No ZeroPath repository found for this entity.
          </Typography>
        </Box>
      </InfoCard>
    );
  }

  return (
    <ZeroPathSummaryCards
      repository={repository}
      severityCounts={data?.severityCounts ?? { critical: 0, high: 0, medium: 0, low: 0, total: 0 }}
      issues={data?.issues ?? []}
    />
  );
};
