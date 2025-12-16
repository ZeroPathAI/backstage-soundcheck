/**
 * @deprecated This file is no longer used in the new frontend system.
 * Entity pages are now configured declaratively via extensions in app-config.yaml.
 *
 * The ZeroPath security content is now provided by the entity-content:zeropath/security extension.
 *
 * Example configuration in app-config.yaml:
 * ```yaml
 * app:
 *   extensions:
 *     - entity-content:zeropath/security:
 *         config:
 *           path: /security
 *           title: Security
 *           filter:
 *             kind: Component
 * ```
 */

// This file is kept for reference but is not imported by the app.
// The new frontend system from @backstage/frontend-defaults handles
// entity pages automatically through extensions.

export {};
