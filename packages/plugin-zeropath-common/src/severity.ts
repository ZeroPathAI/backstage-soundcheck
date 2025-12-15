import type { SeverityLevel } from './types';

/**
 * Severity window definition for score-to-level mapping
 */
export interface SeverityWindow {
  level: SeverityLevel;
  min: number;
  max: number;
}

/**
 * Severity windows mapping ZeroPath scores to severity levels
 * - Critical: 90-100
 * - High: 70-89
 * - Medium: 40-69
 * - Low: 10-39
 */
export const SEVERITY_WINDOWS: ReadonlyArray<SeverityWindow> = [
  { level: 'critical', min: 90, max: 100 },
  { level: 'high', min: 70, max: 89 },
  { level: 'medium', min: 40, max: 69 },
  { level: 'low', min: 10, max: 39 },
] as const;

/**
 * Maps a ZeroPath score to a severity level
 * @param score - The numeric score from ZeroPath (0-100)
 * @returns The corresponding severity level, or undefined if score is outside all windows
 */
export function mapScoreToSeverity(score: number): SeverityLevel | undefined {
  if (!Number.isFinite(score)) {
    return undefined;
  }
  for (const window of SEVERITY_WINDOWS) {
    if (score >= window.min && score <= window.max) {
      return window.level;
    }
  }
  return undefined;
}

/**
 * Gets the display color for a severity level
 * @param severity - The severity level
 * @returns A hex color string
 */
export function getSeverityColor(severity: SeverityLevel): string {
  switch (severity) {
    case 'critical':
      return '#d32f2f'; // red
    case 'high':
      return '#f57c00'; // orange
    case 'medium':
      return '#fbc02d'; // yellow
    case 'low':
      return '#1976d2'; // blue
    default:
      return '#757575'; // grey
  }
}

/**
 * Gets severity levels in order from most to least severe
 */
export function getSeverityOrder(): readonly SeverityLevel[] {
  return ['critical', 'high', 'medium', 'low'] as const;
}
