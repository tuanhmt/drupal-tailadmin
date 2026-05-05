/**
 * JSON:API spec types (https://jsonapi.org/format/).
 *
 * Naming convention:
 *   - Spec-defined types (Resource, Document, Error, ...) use plain names.
 *   - Project-specific custom types are prefixed with `T` (e.g. `TProduct`).
 */

export type JsonApiAttributes = Record<string, unknown>;

export interface JsonApiRelationshipDataRef {
  type: string;
  id: string;
}

export interface JsonApiRelationship {
  data?:
    | JsonApiRelationshipDataRef
    | JsonApiRelationshipDataRef[]
    | null;
  links?: JsonApiLinks;
  meta?: Record<string, unknown>;
}

export type JsonApiRelationships = Record<string, JsonApiRelationship>;

export interface JsonApiLinks {
  self?: string;
  related?: string;
  first?: string;
  prev?: string;
  next?: string;
  last?: string;
  [k: string]: string | undefined;
}

export interface JsonApiResource<
  TAttrs extends JsonApiAttributes = JsonApiAttributes,
  TRels extends JsonApiRelationships = JsonApiRelationships,
> {
  type: string;
  id: string;
  attributes?: TAttrs;
  relationships?: TRels;
  links?: JsonApiLinks;
  meta?: Record<string, unknown>;
}

export interface JsonApiError {
  id?: string;
  status?: string;
  code?: string;
  title?: string;
  detail?: string;
  source?: { pointer?: string; parameter?: string };
  meta?: Record<string, unknown>;
}

export interface JsonApiDocument<TData> {
  data: TData;
  included?: JsonApiResource[];
  links?: JsonApiLinks;
  meta?: Record<string, unknown>;
  errors?: JsonApiError[];
}

/** Single-resource response. */
export type JsonApiSingleResponse<
  TAttrs extends JsonApiAttributes = JsonApiAttributes,
  TRels extends JsonApiRelationships = JsonApiRelationships,
> = JsonApiDocument<JsonApiResource<TAttrs, TRels>>;

/** Collection response. */
export type JsonApiCollectionResponse<
  TAttrs extends JsonApiAttributes = JsonApiAttributes,
  TRels extends JsonApiRelationships = JsonApiRelationships,
> = JsonApiDocument<JsonApiResource<TAttrs, TRels>[]>;

/* ----------------------------- Query options ---------------------------- */

/**
 * Filter expression. JSON:API filter syntax is implementation-defined; Drupal
 * supports both shorthand (`filter[field]=value`) and grouped form
 * (`filter[group][condition][...]`). We accept arbitrary nested objects and
 * flatten them into bracketed query keys.
 */
export type JsonApiFilter = Record<string, unknown>;

export interface JsonApiPage {
  /** Drupal JSON:API uses page[offset] and page[limit]. */
  offset?: number;
  limit?: number;
  /** Some backends use page[number] / page[size]; included for flexibility. */
  number?: number;
  size?: number;
}

export interface JsonApiQuery {
  /** Sparse fieldsets: `{ "commerce_product--default": "title,price" }`. */
  fields?: Record<string, string | string[]>;
  /** Relationship paths to include (`["variations", "stores"]`). */
  include?: string | string[];
  /** Sort string(s) per JSON:API: `-created,title`. */
  sort?: string | string[];
  /** Pagination. */
  page?: JsonApiPage;
  /** Drupal-style filter object. */
  filter?: JsonApiFilter;
  /** Any extra raw query params (escape hatch). */
  extra?: Record<string, string | number | boolean | undefined>;
}
