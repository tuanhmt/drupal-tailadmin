import type { JsonApiCreateResourceBody, JsonApiResource, JsonApiUpdateResourceBody } from "next-drupal";

import { drupal } from "@/lib/drupal";
import { getServerToken } from "@/lib/utils";

import { getProductResourceType } from "./config";
import {
  ProductApiError,
  accessTokenStringToDrupalAuth,
} from "./helpers";
import type {
  TProduct,
  TProductCollection,
  TJsonApiListParams,
} from "./types";

async function authToken() {
  try {
    const accessToken = await getServerToken();
    return accessTokenStringToDrupalAuth(accessToken);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "Unauthenticated") {
        throw new ProductApiError("Unauthorized", 401);
      }
      if (e.message === "RefreshAccessTokenError") {
        throw new ProductApiError("Session expired", 401);
      }
    }
    throw e;
  }
}

const resourceType = () => getProductResourceType();

export async function queryProductList(
  params?: TJsonApiListParams
): Promise<TProductCollection> {
  const token = await authToken();
  const list = await drupal.getResourceCollection<JsonApiResource[]>(
    resourceType(),
    { params: params ?? {}, withAuth: token }
  );
  return list as TProductCollection;
}

export async function queryProductById(id: string): Promise<TProduct> {
  const token = await authToken();
  const one = await drupal.getResource<JsonApiResource>(
    resourceType(),
    id,
    { withAuth: token }
  );
  return one as TProduct;
}

export async function queryProductCreate(
  body: JsonApiCreateResourceBody
): Promise<TProduct> {
  const token = await authToken();
  const created = await drupal.createResource<JsonApiResource>(
    resourceType(),
    body,
    { withAuth: token }
  );
  return created as TProduct;
}

export async function queryProductUpdate(
  id: string,
  body: JsonApiUpdateResourceBody
): Promise<TProduct> {
  const token = await authToken();
  const updated = await drupal.updateResource<JsonApiResource>(
    resourceType(),
    id,
    body,
    { withAuth: token }
  );
  return updated as TProduct;
}

export async function queryProductDelete(id: string): Promise<boolean> {
  const token = await authToken();
  return drupal.deleteResource(resourceType(), id, { withAuth: token });
}
