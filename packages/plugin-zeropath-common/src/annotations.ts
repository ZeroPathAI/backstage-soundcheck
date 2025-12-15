/**
 * Default annotation key used to identify ZeroPath repositories
 * This annotation should contain the repository slug (e.g., "org/repo")
 */
export const DEFAULT_REPOSITORY_ANNOTATION = 'github.com/project-slug';

/**
 * Formats a repository slug by trimming whitespace and removing .git suffix
 * @param value - The raw repository slug value
 * @returns The formatted slug, or undefined if the value is empty
 */
export function formatSlug(value: string): string | undefined {
  const trimmed = value.trim().replace(/\.git$/i, '');
  if (!trimmed) {
    return undefined;
  }
  return trimmed;
}

/**
 * Formats a repository slug with an optional prefix
 * If the slug already contains a slash (org/repo format), it's returned as-is
 * Otherwise, the prefix is prepended if provided
 *
 * @param value - The raw repository slug value
 * @param prefix - Optional prefix to prepend to simple names
 * @returns The formatted slug with prefix, or undefined if empty
 */
export function formatSlugWithPrefix(value: string, prefix?: string): string | undefined {
  const trimmed = formatSlug(value);
  if (!trimmed) {
    return undefined;
  }
  // If the slug already contains a slash, assume it's in org/repo format
  if (trimmed.includes('/')) {
    return trimmed;
  }
  // If no prefix is configured, return the simple name
  if (!prefix) {
    return trimmed;
  }
  // Prepend the prefix
  return `${prefix}/${trimmed}`;
}
