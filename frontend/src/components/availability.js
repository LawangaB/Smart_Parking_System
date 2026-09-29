/** How full a location is, as a word and a CSS modifier. */
export function availabilityLevel(available, total) {
  if (!total) return { key: 'none', word: 'No bays yet' };
  if (available <= 0) return { key: 'full', word: 'Full' };
  if (available / total <= 0.25) return { key: 'low', word: 'Filling up' };
  return { key: 'ok', word: 'Free' };
}