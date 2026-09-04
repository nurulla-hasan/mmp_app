export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | string[]
  | number[];

export function buildQueryString(
  query: Record<string, QueryValue> = {}
): string {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
      return;
    }

    params.set(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}
