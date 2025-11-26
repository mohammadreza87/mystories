/**
 * Shared formatting utilities.
 * Extracted to eliminate duplication across components.
 */

/**
 * Language code to flag emoji mapping.
 * Previously duplicated in StoryLibrary.tsx.
 */
const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇺🇸',
  tr: '🇹🇷',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  ar: '🇸🇦',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
  ru: '🇷🇺',
  pt: '🇵🇹',
  it: '🇮🇹',
  nl: '🇳🇱',
  pl: '🇵🇱',
  sv: '🇸🇪',
  hi: '🇮🇳',
  bn: '🇧🇩',
  ur: '🇵🇰',
  id: '🇮🇩',
  vi: '🇻🇳',
  th: '🇹🇭',
  uk: '🇺🇦',
  ro: '🇷🇴',
  el: '🇬🇷',
  cs: '🇨🇿',
  da: '🇩🇰',
  fi: '🇫🇮',
  no: '🇳🇴',
};

/**
 * Get flag emoji for a language code.
 * @param languageCode - ISO 639-1 language code (e.g., 'en', 'tr')
 * @returns Flag emoji or globe emoji for unknown languages
 */
export function getLanguageFlag(languageCode: string | null | undefined): string {
  return LANGUAGE_FLAGS[languageCode || 'en'] || '🌍';
}

/**
 * Format a date string for display.
 * @param dateString - ISO date string
 * @returns Formatted date (e.g., "Nov 26, 2025")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format relative time (e.g., "2 hours ago").
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 7) {
    return formatDate(dateString);
  }
  if (diffDay > 0) {
    return `${diffDay}d ago`;
  }
  if (diffHour > 0) {
    return `${diffHour}h ago`;
  }
  if (diffMin > 0) {
    return `${diffMin}m ago`;
  }
  return 'Just now';
}

/**
 * Pluralize a word based on count.
 * @param count - Number to check
 * @param singular - Singular form (e.g., "story")
 * @param plural - Plural form (e.g., "stories")
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || `${singular}s`);
}
