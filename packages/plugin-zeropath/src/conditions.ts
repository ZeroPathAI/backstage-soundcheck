import { Entity } from '@backstage/catalog-model';
import { DEFAULT_REPOSITORY_ANNOTATION } from '@zeropath/backstage-plugin-zeropath-common';

/**
 * Checks if an entity has the ZeroPath repository annotation
 * Use this to conditionally render ZeroPath components on entity pages
 *
 * @example
 * ```tsx
 * <EntitySwitch>
 *   <EntitySwitch.Case if={isZeroPathAvailable}>
 *     <ZeroPathSecurityCard />
 *   </EntitySwitch.Case>
 * </EntitySwitch>
 * ```
 */
export function isZeroPathAvailable(entity: Entity): boolean {
  const annotation = entity.metadata?.annotations?.[DEFAULT_REPOSITORY_ANNOTATION];
  return typeof annotation === 'string' && annotation.trim().length > 0;
}
