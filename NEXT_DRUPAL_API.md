# Next-Drupal Library API Reference

This document summarizes the key types, classes, and methods from the `next-drupal` library.

## Core Types

### AccessToken
```typescript
interface AccessToken {
  token_type: string        // Usually "Bearer"
  access_token: string      // The actual token string
  expires_in: number       // Expiration time in seconds
  refresh_token?: string    // Optional refresh token
}
```

### NextDrupalAuth
The `auth` option can accept multiple types:
```typescript
type NextDrupalAuth =
  | AccessToken                                    // Direct AccessToken object
  | NextDrupalAuthClientIdSecret                   // { clientId, clientSecret, url?, scope? }
  | NextDrupalAuthUsernamePassword                 // { username, password }
  | (() => string)                                 // Function returning auth header
  | string                                         // Direct auth header string
```

### JsonApiOptions
Options for JSON:API requests:
```typescript
type JsonApiOptions = {
  deserialize?: boolean      // Set to false for raw JSON:API response
  params?: JsonApiParams    // Filter, fields, include, sort, etc.
  withAuth?: boolean | NextDrupalAuth  // Auth for this request
  locale?: Locale
  defaultLocale?: Locale
}
```

### JsonApiWithNextFetchOptions
Next.js fetch options:
```typescript
type JsonApiWithNextFetchOptions = {
  next?: NextFetchRequestConfig  // { revalidate, tags }
  cache?: RequestCache           // "no-store", "force-cache", etc.
}
```

## Core Classes

### NextDrupalBase
Base class providing core functionality.

#### Constructor
```typescript
constructor(baseUrl: string, options?: NextDrupalBaseOptions)
```

#### Key Properties
- `baseUrl: string` - Drupal site base URL
- `apiPrefix: string` - JSON:API prefix (default: "" for base, "/jsonapi" for NextDrupal)
- `auth?: NextDrupalAuth` - Authentication configuration
- `accessToken?: AccessToken` - Long-lived access token
- `withAuth: boolean` - Default auth behavior (default: false)
- `fetcher?: Fetcher` - Custom fetch function
- `headers: Headers` - Default headers

#### Key Methods

**fetch(input, options?)**
```typescript
async fetch(
  input: RequestInfo,
  options?: FetchOptions
): Promise<Response>
```
- `withAuth?: boolean | NextDrupalAuth` - Auth for this request

**getAuthorizationHeader(auth)**
```typescript
async getAuthorizationHeader(auth: NextDrupalAuth): Promise<string>
```
Builds Authorization header from auth config.

**getAccessToken(clientIdSecret?)**
```typescript
async getAccessToken(
  clientIdSecret?: NextDrupalAuthClientIdSecret
): Promise<AccessToken>
```
Retrieves access token using client credentials.

**buildUrl(path, searchParams?)**
```typescript
buildUrl(
  path: string,
  searchParams?: EndpointSearchParams
): URL
```
Builds URL with query parameters.

**buildEndpoint(options)**
```typescript
async buildEndpoint({
  locale?: string,
  resourceType?: string,
  path?: string,
  searchParams?: EndpointSearchParams
}): Promise<string>
```
Builds full JSON:API endpoint URL.

### NextDrupal
Extends `NextDrupalBase` with JSON:API-specific methods.

#### Constructor
```typescript
constructor(baseUrl: string, options?: NextDrupalOptions)
```

#### Additional Options
- `cache?: DataCache` - Custom cache implementation
- `deserializer?: JsonDeserializer` - Custom JSON:API deserializer
- `throwJsonApiErrors?: boolean` - Throw errors in non-production
- `useDefaultEndpoints?: boolean` - Use default endpoint structure

#### Key Methods

**getResource(type, uuid, options?)**
```typescript
async getResource<T extends JsonApiResource>(
  type: string,
  uuid: string,
  options?: JsonApiOptions & JsonApiWithCacheOptions & JsonApiWithNextFetchOptions
): Promise<T>
```
Fetches a single resource by UUID.

**getResourceByPath(path, options?)**
```typescript
async getResourceByPath<T extends JsonApiResource>(
  path: string,
  options?: {
    isVersionable?: boolean
  } & JsonApiOptions & JsonApiWithNextFetchOptions
): Promise<T>
```
Fetches a resource by path (requires Decoupled Router).

**getResourceCollection(type, options?)**
```typescript
async getResourceCollection<T = JsonApiResource[]>(
  type: string,
  options?: {
    deserialize?: boolean
  } & JsonApiOptions & JsonApiWithNextFetchOptions
): Promise<T>
```
Fetches a collection of resources.

**createResource(type, body, options?)**
```typescript
async createResource<T extends JsonApiResource>(
  type: string,
  body: JsonApiCreateResourceBody,
  options?: JsonApiOptions & JsonApiWithNextFetchOptions
): Promise<T>
```
Creates a new resource.

**updateResource(type, uuid, body, options?)**
```typescript
async updateResource<T extends JsonApiResource>(
  type: string,
  uuid: string,
  body: JsonApiUpdateResourceBody,
  options?: JsonApiOptions & JsonApiWithNextFetchOptions
): Promise<T>
```
Updates an existing resource.

**deleteResource(type, uuid, options?)**
```typescript
async deleteResource(
  type: string,
  uuid: string,
  options?: JsonApiOptions & JsonApiWithNextFetchOptions
): Promise<boolean>
```
Deletes a resource.

**translatePath(path, options?)**
```typescript
async translatePath(
  path: string,
  options?: JsonApiWithAuthOption & JsonApiWithNextFetchOptions
): Promise<DrupalTranslatedPath | null>
```
Translates a path to resource info (requires Decoupled Router).

**getMenu(menuName, options?)**
```typescript
async getMenu<T = DrupalMenuItem>(
  menuName: string,
  options?: JsonApiOptions & JsonApiWithCacheOptions & JsonApiWithNextFetchOptions
): Promise<{ items: T[], tree: T[] }>
```
Fetches a menu (requires JSON:API Menu Items).

**getView(name, options?)**
```typescript
async getView<T = JsonApiResource>(
  name: string,
  options?: JsonApiOptions & JsonApiWithNextFetchOptions
): Promise<DrupalView<T>>
```
Fetches a view (requires JSON:API Views).

**getSearchIndex(name, options?)**
```typescript
async getSearchIndex<T = JsonApiResource[]>(
  name: string,
  options?: JsonApiOptions & JsonApiWithNextFetchOptions
): Promise<T>
```
Fetches search results (requires JSON:API Search API).

## Authentication Patterns

### Pattern 1: Set auth in constructor
```typescript
const drupal = new NextDrupal(baseUrl, {
  auth: accessToken,  // All requests use this auth
  withAuth: true     // Default to authenticated requests
})
```

### Pattern 2: Use withAuth per-request
```typescript
const drupal = new NextDrupal(baseUrl)

// Per-request auth
const articles = await drupal.getResourceCollection("node--article", {
  withAuth: accessToken  // Only this request uses auth
})
```

### Pattern 3: Use withAuth boolean
```typescript
const drupal = new NextDrupal(baseUrl, {
  auth: accessToken,
  withAuth: true
})

// Uses constructor auth
const articles = await drupal.getResourceCollection("node--article", {
  withAuth: true
})
```

## Helper Functions

**isAccessTokenAuth(auth)**
```typescript
function isAccessTokenAuth(auth: NextDrupalAuth): auth is AccessToken
```
Checks if auth is an AccessToken.

**isClientIdSecretAuth(auth)**
```typescript
function isClientIdSecretAuth(auth: NextDrupalAuth): auth is NextDrupalAuthClientIdSecret
```
Checks if auth uses client credentials.

**isBasicAuth(auth)**
```typescript
function isBasicAuth(auth: NextDrupalAuth): auth is NextDrupalAuthUsernamePassword
```
Checks if auth uses username/password.

## Type Exports

- `AccessToken` - OAuth2 access token interface
- `DrupalNode` - Node entity type
- `DrupalTaxonomyTerm` - Taxonomy term type
- `DrupalMedia` - Media entity type
- `DrupalFile` - File entity type
- `DrupalUser` - User entity type
- `JsonApiResource` - Base resource type
- `JsonApiResponse` - JSON:API response structure
- `DrupalTranslatedPath` - Translated path result
- `DrupalMenuItem` - Menu item type
- `DrupalView` - View result type
