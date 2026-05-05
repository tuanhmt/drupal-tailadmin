import { jsonApi, type JsonApiFetchOptions } from "./client";
import type {
  JsonApiCollectionResponse,
  JsonApiSingleResponse,
  JsonApiQuery,
} from "./types";

/**
 * Build a typed CRUD helper for a single Drupal JSON:API entity bundle.
 *
 * Drupal exposes resources at `/jsonapi/{entity_type}/{bundle}`, so for
 * `commerce_product--default` we pass:
 *   - `resourceType`: `"commerce_product--default"` (the JSON:API `type`)
 *   - `resourcePath`: `"commerce_product/default"` (URL segment)
 *
 * The factory is generic over a project type (e.g. `TProductAttributes`),
 * which is the shape of `attributes` for that bundle. Spec-defined fields
 * (id, type, relationships) are returned untyped — wrap with project types
 * as needed in services.
 *
 * @example
 *   const productsCrud = makeJsonApiCrud<TProductAttributes>({
 *     resourceType: "commerce_product--default",
 *     resourcePath: "commerce_product/default",
 *   });
 *   const list = await productsCrud.list({ page: { limit: 20 } });
 */
export interface TCrudConfig {
  /** The JSON:API `type` value, e.g. "commerce_product--default". */
  resourceType: string;
  /** The URL path segment, e.g. "commerce_product/default". */
  resourcePath: string;
}

export function makeJsonApiCrud<
  TAttrs extends Record<string, unknown> = Record<string, unknown>,
>(config: TCrudConfig) {
  const { resourceType, resourcePath } = config;

  return {
    resourceType,
    resourcePath,

    list(
      query?: JsonApiQuery,
      opts?: JsonApiFetchOptions,
    ): Promise<JsonApiCollectionResponse<TAttrs>> {
      return jsonApi.getCollection<TAttrs>(resourcePath, query, opts);
    },

    get(
      id: string,
      query?: JsonApiQuery,
      opts?: JsonApiFetchOptions,
    ): Promise<JsonApiSingleResponse<TAttrs>> {
      return jsonApi.getOne<TAttrs>(resourcePath, id, query, opts);
    },

    create(
      attributes: Partial<TAttrs>,
      relationships?: Record<string, unknown>,
      opts?: JsonApiFetchOptions,
    ): Promise<JsonApiSingleResponse<TAttrs>> {
      return jsonApi.create<TAttrs>(
        resourcePath,
        {
          data: {
            type: resourceType,
            attributes: attributes as TAttrs,
            ...(relationships ? { relationships } : {}),
          },
        },
        opts,
      );
    },

    update(
      id: string,
      attributes: Partial<TAttrs>,
      relationships?: Record<string, unknown>,
      opts?: JsonApiFetchOptions,
    ): Promise<JsonApiSingleResponse<TAttrs>> {
      return jsonApi.update<TAttrs>(
        resourcePath,
        id,
        {
          data: {
            type: resourceType,
            id,
            attributes,
            ...(relationships ? { relationships } : {}),
          },
        },
        opts,
      );
    },

    remove(id: string, opts?: JsonApiFetchOptions): Promise<null> {
      return jsonApi.remove(resourcePath, id, opts);
    },
  };
}

export type JsonApiCrud<TAttrs extends Record<string, unknown>> = ReturnType<
  typeof makeJsonApiCrud<TAttrs>
>;
