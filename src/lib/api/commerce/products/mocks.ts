import { PRODUCT_DEFAULT_TYPE } from "./config";
import type { TProduct } from "./types";

/** Test helper — minimal valid `commerce_product--default` shape. */
export function mockProduct(overrides: Partial<TProduct> = {}): TProduct {
  return {
    type: PRODUCT_DEFAULT_TYPE,
    id:   "mock-id",
    attributes: {
      title: "Mock product",
    },
    ...overrides,
  };
}
