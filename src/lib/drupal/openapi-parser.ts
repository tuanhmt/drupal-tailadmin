/**
 * OpenAPI Parser Utilities
 *
 * Parses Drupal OpenAPI JSON:API metadata (Swagger 2.0 format) to extract entity type information
 */

export interface EntityField {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  description?: string;
  format?: string;
  maxLength?: number;
  default?: any;
}

export interface EntityTypeInfo {
  machineName: string; // e.g., "node--article"
  label: string; // Human-readable label
  primaryField: string; // Primary display field (title, name, etc.)
  fields: EntityField[];
  supportedOperations: {
    getCollection: boolean;
    getIndividual: boolean;
    post: boolean;
    patch: boolean;
    delete: boolean;
  };
}

/**
 * Parses OpenAPI Swagger 2.0 JSON:API metadata to extract entity types
 */
export function parseOpenApiMetadata(openApiData: any): EntityTypeInfo[] {
  const entities: EntityTypeInfo[] = [];
  const definitions = openApiData.definitions || {};
  const paths = openApiData.paths || {};
  const tags = openApiData.tags || [];

  // Create a map of entity types from tags
  const tagMap = new Map<string, any>();
  tags.forEach((tag: any) => {
    if (tag["x-entity-type"]) {
      const entityType = tag["x-entity-type"];
      const definitionRef = tag["x-definition"]?.["$ref"];
      if (definitionRef) {
        const defName = definitionRef.replace("#/definitions/", "");
        tagMap.set(entityType, {
          label: tag.name,
          description: tag.description,
          definitionName: defName,
        });
      }
    }
  });

  // Process each definition
  for (const [defName, definition] of Object.entries(definitions)) {
    const def = definition as any;

    // Check if this is an entity definition (node--article, user--user, etc.)
    if (!defName.includes("--") || !def.properties?.data) {
      continue;
    }

    const entityType = defName; // e.g., "node--article"

    // Find tag info
    let tagInfo = null;
    for (const [entityTypeKey, info] of tagMap.entries()) {
      if (info.definitionName === defName) {
        tagInfo = info;
        break;
      }
    }

    // Extract attributes schema
    const dataSchema = def.properties.data;
    const attributesSchema = dataSchema?.properties?.attributes;
    const attributesRequired = dataSchema?.properties?.attributes?.required || [];
    const dataRequired = dataSchema?.required || [];

    // Extract fields from attributes
    const fields: EntityField[] = [];
    if (attributesSchema?.properties) {
      Object.entries(attributesSchema.properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
        // Skip internal/system fields
        if (
          fieldName.startsWith("drupal_internal__") ||
          fieldName.startsWith("_") ||
          fieldName === "id" ||
          fieldName === "type"
        ) {
          return;
        }

        // Handle nested objects (like langcode, path, body, etc.)
        let fieldType = fieldSchema.type || "string";
        let fieldLabel = fieldSchema.title || fieldName;

        // For complex objects, try to extract the main value
        if (fieldSchema.type === "object" && fieldSchema.properties) {
          // Check if it has a "value" property (common pattern)
          if (fieldSchema.properties.value) {
            fieldType = fieldSchema.properties.value.type || "string";
            fieldLabel = fieldSchema.properties.value.title || fieldSchema.title || fieldName;
          } else {
            // It's a complex object, mark as object
            fieldType = "object";
          }
        }

        fields.push({
          name: fieldName,
          type: fieldType,
          label: fieldLabel,
          required: attributesRequired.includes(fieldName) || dataRequired.includes(fieldName),
          description: fieldSchema.description,
          format: fieldSchema.format,
          maxLength: fieldSchema.maxLength,
          default: fieldSchema.default,
        });
      });
    }

    // Determine primary field
    let primaryField = "id";
    if (fields.find((f) => f.name === "title")) {
      primaryField = "title";
    } else if (fields.find((f) => f.name === "name")) {
      primaryField = "name";
    } else if (fields.find((f) => f.name === "label")) {
      primaryField = "label";
    } else if (fields.find((f) => f.name === "username")) {
      primaryField = "username";
    }

    // Check supported operations from paths
    // Path format: /node/article or /user/user for collections
    // Path format: /node/article/{entity} or /user/user/{entity} for individuals
    const pathPrefix = entityType.startsWith("node--")
      ? `/node/${entityType.replace("node--", "")}`
      : entityType.startsWith("user--")
      ? `/user/user`
      : null;

    if (!pathPrefix) {
      continue;
    }

    const collectionPath = paths[pathPrefix];
    const individualPath = paths[`${pathPrefix}/{entity}`];

    const supportedOperations = {
      getCollection: !!collectionPath?.get,
      getIndividual: !!individualPath?.get,
      post: !!collectionPath?.post,
      patch: !!individualPath?.patch,
      delete: !!individualPath?.delete,
    };

    // Get label from tag or definition
    const label = tagInfo?.label || formatEntityLabel(entityType);

    entities.push({
      machineName: entityType,
      label,
      primaryField,
      fields,
      supportedOperations,
    });
  }

  return entities;
}

/**
 * Formats entity machine name to human-readable label
 */
function formatEntityLabel(machineName: string): string {
  // node--article -> Article
  // taxonomy_term--tags -> Tags
  // user--user -> User

  if (machineName.startsWith("node--")) {
    const type = machineName.replace("node--", "");
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  if (machineName.startsWith("taxonomy_term--")) {
    const vocab = machineName.replace("taxonomy_term--", "");
    return vocab.charAt(0).toUpperCase() + vocab.slice(1);
  }

  if (machineName.startsWith("comment--")) {
    const type = machineName.replace("comment--", "");
    return `${type.charAt(0).toUpperCase() + type.slice(1)} Comments`;
  }

  if (machineName === "user--user") {
    return "User";
  }

  return machineName;
}

/**
 * Gets the API route path for an entity type
 */
export function getEntityApiPath(entityType: string): string {
  // node--article -> /api/articles
  // taxonomy_term--tags -> /api/taxonomy-tags
  // user--user -> /api/users

  if (entityType.startsWith("node--")) {
    const type = entityType.replace("node--", "");
    return `/api/${type}s`;
  }

  if (entityType.startsWith("taxonomy_term--")) {
    const vocab = entityType.replace("taxonomy_term--", "");
    return `/api/taxonomy-${vocab}`;
  }

  if (entityType.startsWith("comment--")) {
    const type = entityType.replace("comment--", "");
    return `/api/comments-${type}`;
  }

  if (entityType === "user--user") {
    return `/api/users`;
  }

  return `/api/${entityType.replace("--", "-")}`;
}

/**
 * Gets the admin page path for an entity type
 */
export function getEntityAdminPath(entityType: string): string {
  // node--article -> /articles
  // taxonomy_term--tags -> /taxonomy/tags
  // user--user -> /users

  if (entityType.startsWith("node--")) {
    const type = entityType.replace("node--", "");
    return `/${type}s`;
  }

  if (entityType.startsWith("taxonomy_term--")) {
    const vocab = entityType.replace("taxonomy_term--", "");
    return `/taxonomy/${vocab}`;
  }

  if (entityType.startsWith("comment--")) {
    const type = entityType.replace("comment--", "");
    return `/comments/${type}`;
  }

  if (entityType === "user--user") {
    return `/users`;
  }

  return `/${entityType.replace("--", "-")}`;
}

/**
 * Gets field information for a specific entity type
 */
export function getEntityFields(
  entityType: string,
  openApiData: any
): EntityField[] {
  const entities = parseOpenApiMetadata(openApiData);
  const entity = entities.find((e) => e.machineName === entityType);
  return entity?.fields || [];
}

/**
 * Gets primary field name for an entity type
 */
export function getPrimaryField(
  entityType: string,
  openApiData: any
): string {
  const entities = parseOpenApiMetadata(openApiData);
  const entity = entities.find((e) => e.machineName === entityType);
  return entity?.primaryField || "id";
}
