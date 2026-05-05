import { getServerAccessToken } from "@/lib/auth";
import { buildJsonApiQueryString } from "./query";
import type {
  JsonApiCollectionResponse,
  JsonApiError,
  JsonApiSingleResponse,
  JsonApiQuery,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? "";
const JSONAPI_PREFIX = "/jsonapi";

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

/**
 * Thrown for any non-2xx response from a JSON:API request. Carries the
 * structured `errors[]` array that JSON:API servers return so callers can
 * surface field-level validation messages.
 */
export class JsonApiRequestError extends Error {
  public readonly status: number;
  public readonly errors: JsonApiError[];
  public readonly url: string;

  constructor(
    message: string,
    status: number,
    errors: JsonApiError[],
    url: string,
  ) {
    super(message);
    this.name = "JsonApiRequestError";
    this.status = status;
    this.errors = errors;
    this.url = url;
  }
}

/* ------------------------------------------------------------------ */
/* Auth header resolution                                              */
/* ------------------------------------------------------------------ */

/**
 * Resolve the bearer token for the current request.
 *
 * SECURITY MODEL
 * --------------
 * Drupal access/refresh tokens live ONLY in the encrypted, HTTP-only
 * NextAuth session cookie. They never reach the browser. Therefore this
 * function only resolves a token when running on the server — it reads
 * the JWT directly via `getServerAccessToken()`.
 *
 * If invoked from a Client Component, no Authorization header is added:
 * such code must instead route mutations through a Server Action or
 * Route Handler that performs the request server-side.
 *
 * The optional `accessToken` argument is an escape hatch for server code
 * that already has a token in hand (e.g. a cron job using a service
 * account, or a backend-to-backend call).
 */
async function resolveAuthHeader(
  explicitToken?: string,
): Promise<Record<string, string>> {
  if (explicitToken) {
    return { Authorization: `Bearer ${explicitToken}` };
  }

  if (typeof window !== "undefined") {
    // Browser-side caller — refuse to attach a token. By design.
    return {};
  }

  try {
    const token = await getServerAccessToken();
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    // No usable session — proceed unauthenticated.
  }
  return {};
}

/* ------------------------------------------------------------------ */
/* Fetch wrapper                                                       */
/* ------------------------------------------------------------------ */

export interface JsonApiFetchOptions {
  /**
   * Optional explicit bearer token (server-only escape hatch — e.g. a
   * service-account token used from a cron/job). In normal request
   * handling the token is read automatically from the encrypted JWT
   * cookie; you do NOT need to pass this.
   */
  accessToken?: string;
  /** Extra fetch options (revalidate, cache, signal, headers...). */
  next?: RequestInit["next"];
  cache?: RequestInit["cache"];
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/**
 * Build an absolute URL for a JSON:API path. Accepts either:
 *   - "node/article"                  (collection path)
 *   - "commerce_product/default/{id}" (single resource)
 *   - or a fully-qualified URL (used by `next`/`prev` link traversal).
 */
function buildUrl(path: string, query?: JsonApiQuery): string {
  if (/^https?:\/\//i.test(path)) {
    // Already absolute (e.g. follow-through from `links.next`).
    const [base, existingQs] = path.split("?", 2);
    const qs = buildJsonApiQueryString(query);
    if (!qs) return path;
    return existingQs ? `${base}?${existingQs}&${qs.slice(1)}` : `${base}${qs}`;
  }

  const clean = path.startsWith("/") ? path : `/${path}`;
  const url = `${BASE_URL}${JSONAPI_PREFIX}${clean}`;
  return `${url}${buildJsonApiQueryString(query)}`;
}

async function parseErrorBody(res: Response): Promise<JsonApiError[]> {
  try {
    const data = (await res.json()) as { errors?: JsonApiError[] };
    return data.errors ?? [];
  } catch {
    return [];
  }
}

/** Low-level request — returns the parsed JSON body (or `null` for 204). */
async function request<T>(
  method: string,
  path: string,
  body: unknown,
  query: JsonApiQuery | undefined,
  opts: JsonApiFetchOptions,
): Promise<T> {
  const url = buildUrl(path, query);
  const authHeaders = await resolveAuthHeader(opts.accessToken);

  const headers: Record<string, string> = {
    Accept: "application/vnd.api+json",
    ...authHeaders,
    ...opts.headers,
  };
  if (body !== undefined && body !== null) {
    headers["Content-Type"] = "application/vnd.api+json";
  }

  const init: RequestInit = {
    method,
    headers,
    body: body === undefined || body === null ? undefined : JSON.stringify(body),
    signal: opts.signal,
  };
  if (opts.cache) init.cache = opts.cache;
  if (opts.next) (init as RequestInit & { next?: unknown }).next = opts.next;

  const res = await fetch(url, init);

  if (res.status === 204) {
    return null as T;
  }

  if (!res.ok) {
    const errors = await parseErrorBody(res);
    const detail =
      errors[0]?.detail ?? errors[0]?.title ?? res.statusText ?? "Request failed";
    throw new JsonApiRequestError(
      `JSON:API ${method} ${url} → ${res.status}: ${detail}`,
      res.status,
      errors,
      url,
    );
  }

  return (await res.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export const jsonApi = {
  /** GET a collection. */
  getCollection<TAttrs extends Record<string, unknown> = Record<string, unknown>>(
    resource: string,
    query?: JsonApiQuery,
    opts: JsonApiFetchOptions = {},
  ): Promise<JsonApiCollectionResponse<TAttrs>> {
    return request<JsonApiCollectionResponse<TAttrs>>(
      "GET",
      resource,
      null,
      query,
      opts,
    );
  },

  /** GET a single resource by id. */
  getOne<TAttrs extends Record<string, unknown> = Record<string, unknown>>(
    resource: string,
    id: string,
    query?: JsonApiQuery,
    opts: JsonApiFetchOptions = {},
  ): Promise<JsonApiSingleResponse<TAttrs>> {
    return request<JsonApiSingleResponse<TAttrs>>(
      "GET",
      `${resource}/${id}`,
      null,
      query,
      opts,
    );
  },

  /** POST (create) a new resource. */
  create<TAttrs extends Record<string, unknown> = Record<string, unknown>>(
    resource: string,
    body: { data: { type: string; attributes?: TAttrs; relationships?: unknown } },
    opts: JsonApiFetchOptions = {},
  ): Promise<JsonApiSingleResponse<TAttrs>> {
    return request<JsonApiSingleResponse<TAttrs>>(
      "POST",
      resource,
      body,
      undefined,
      opts,
    );
  },

  /** PATCH (update) an existing resource. */
  update<TAttrs extends Record<string, unknown> = Record<string, unknown>>(
    resource: string,
    id: string,
    body: {
      data: {
        type: string;
        id: string;
        attributes?: Partial<TAttrs>;
        relationships?: unknown;
      };
    },
    opts: JsonApiFetchOptions = {},
  ): Promise<JsonApiSingleResponse<TAttrs>> {
    return request<JsonApiSingleResponse<TAttrs>>(
      "PATCH",
      `${resource}/${id}`,
      body,
      undefined,
      opts,
    );
  },

  /** DELETE a resource. */
  remove(
    resource: string,
    id: string,
    opts: JsonApiFetchOptions = {},
  ): Promise<null> {
    return request<null>(
      "DELETE",
      `${resource}/${id}`,
      null,
      undefined,
      opts,
    );
  },

  /** Escape hatch — raw JSON request with auth header attached. */
  raw: request,
};
