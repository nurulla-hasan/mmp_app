export function buildQueryString(
  query: Record<string, string | number | boolean | null | undefined> = {}
): string {
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return parts.length ? `?${parts.join('&')}` : '';
}
