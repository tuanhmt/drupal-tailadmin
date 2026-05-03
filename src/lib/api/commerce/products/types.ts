/**
 * Project API types for the default product bundle (`commerce_product--default`).
 *
 * T-prefixed aliases are the stable surface for app code. Base interfaces live here;
 * if you later generate types from OpenAPI, map them to these `T*` names in this file.
 *
 * - Zod schemas in validation.ts should match these types
 * - Actions/queries use these types exclusively
 */

export interface JsonApiLinks {
  [key: string]: string | Record<string, string> | undefined;
}

/** JSON:API `type` + `id` pair. */
export interface ResourceIdentifierObject {
  type: string;
  id: string;
  meta?: Record<string, unknown>;
}

/** Drupal JSON:API resource type literal for the default bundle. */
export type ProductDefaultType = "commerce_product--default";

/** Flat attribute map for the default product bundle (extend as fields grow). */
export interface ProductDefaultAttributes {
  drupal_internal__id?: number;
  title?: string;
  status?: boolean;
  created?: string;
  changed?: string;
  default_langcode?: boolean;
  path?: {
    alias: string | null;
    pid?: number;
    langcode?: string;
  };
  [attribute: string]: unknown;
}

/** Single `commerce_product--default` resource object. */
export interface ProductDefaultResourceObject {
  type: ProductDefaultType;
  id: string;
  attributes?: ProductDefaultAttributes;
  relationships?: Record<
    string,
    { data: ResourceIdentifierObject | ResourceIdentifierObject[] | null }
  >;
  links?: JsonApiLinks;
}

/** POST body: create (no `id` on `data` until Drupal assigns). */
export interface JsonApiCreateRequestProductDefault {
  data: {
    type?: ProductDefaultType;
    attributes: ProductDefaultAttributes;
    relationships?: ProductDefaultResourceObject["relationships"];
  };
}

/** PATCH body: update existing resource. */
export interface JsonApiPatchRequestProductDefault {
  data: {
    type: ProductDefaultType;
    id: string;
    attributes?: Partial<ProductDefaultAttributes>;
    relationships?: ProductDefaultResourceObject["relationships"];
  };
}

/** GET collection (deserialized next-drupal style — array of resources). */
export type JsonApiCollectionProductDefault = ProductDefaultResourceObject[];

export type TProductAttributes = ProductDefaultAttributes;

export type TProduct = ProductDefaultResourceObject;

export type TProductCollection = JsonApiCollectionProductDefault;

export type TProductCreateInput = JsonApiCreateRequestProductDefault;

export type TProductPatchInput = JsonApiPatchRequestProductDefault;

export type TJsonApiListParams = Record<string, string>;

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };
