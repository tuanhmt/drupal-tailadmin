import type { JsonApiFilter, JsonApiQuery } from "./types";

/**
 * Recursively flatten a nested filter/query object into bracketed query
 * params, e.g.
 *   { filter: { status: 1, group: { condition: { path: "title" } } } }
 * becomes
 *   filter[status]=1&filter[group][condition][path]=title
 */
function appendNested(
  params: URLSearchParams,
  key: string,
  value: unknown,
): void {
  if (value === undefined || value === null) return;

  if (Array.isArray(value)) {
    // Drupal accepts comma-separated lists for include/sort/fields.
    params.append(key, value.join(","));
    return;
  }

  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      appendNested(params, `${key}[${k}]`, v);
    }
    return;
  }

  params.append(key, String(value));
}

function appendFilter(params: URLSearchParams, filter: JsonApiFilter): void {
  for (const [k, v] of Object.entries(filter)) {
    appendNested(params, `filter[${k}]`, v);
  }
}

/**
 * Build the query string for a JSON:API request from a `JsonApiQuery`.
 * Returns an empty string if no params are set.
 */
export function buildJsonApiQueryString(query?: JsonApiQuery): string {
  if (!query) return "";
  const params = new URLSearchParams();

  if (query.include) {
    const inc = Array.isArray(query.include)
      ? query.include.join(",")
      : query.include;
    if (inc) params.append("include", inc);
  }

  if (query.sort) {
    const sort = Array.isArray(query.sort) ? query.sort.join(",") : query.sort;
    if (sort) params.append("sort", sort);
  }

  if (query.fields) {
    for (const [type, fields] of Object.entries(query.fields)) {
      const value = Array.isArray(fields) ? fields.join(",") : fields;
      if (value) params.append(`fields[${type}]`, value);
    }
  }

  if (query.page) {
    for (const [k, v] of Object.entries(query.page)) {
      if (v !== undefined) params.append(`page[${k}]`, String(v));
    }
  }

  if (query.filter) appendFilter(params, query.filter);

  if (query.extra) {
    for (const [k, v] of Object.entries(query.extra)) {
      if (v !== undefined) params.append(k, String(v));
    }
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
