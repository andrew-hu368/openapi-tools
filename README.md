# OpenAPI Tools

A TypeScript library providing utilities for working with OpenAPI schemas—ideal for LLMs, API explorers, and automation tools. Effortlessly detect authentication requirements, enumerate endpoints, and retrieve detailed endpoint schemas from OpenAPI 3.x documents.

---

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [detectAuth](#detectauthschema-openapischema-authinfo)
  - [listEndpoints](#listendpointsschema-openapischema-endpointinfo)
  - [getEndpointById](#getendpointbyidschema-openapischema-id-string-endpointdetails--null)
- [Development](#development)
- [Assumptions](#assumptions)
- [Contributing](#contributing)

---

## Features

- **Authentication Detection**: Identify authentication types and requirements from an OpenAPI schema.
- **Endpoint Listing**: List all endpoints with unique identifiers, summaries, and tags.
- **Endpoint Details**: Retrieve complete endpoint schemas by unique identifier.

---

## Installation

```bash
npm install openapi-tools
# or
pnpm add openapi-tools
```

---

## Quick Start

```typescript
import { detectAuth, listEndpoints, getEndpointById } from 'openapi-tools';
import type { OpenAPISchema } from 'openapi-tools';

// Load your OpenAPI schema (must be a pre-parsed JSON object)
const schema: OpenAPISchema = {
  openapi: "3.1.0",
  // ... your schema
};

// 1. Detect authentication
const authInfo = detectAuth(schema);
console.log(authInfo);
// Example output:
// {
//   type: 'oauth2',
//   schemes: [
//     {
//       name: 'petstore_auth',
//       type: 'oauth2',
//       details: { flows: {...} }
//     }
//   ]
// }

// 2. List all endpoints
const endpoints = listEndpoints(schema);
console.log(endpoints);
// [
//   {
//     id: 'GET__pet__petId',
//     path: '/pet/{petId}',
//     method: 'GET',
//     summary: 'Find pet by ID',
//     operationId: 'getPetById',
//     // ...
//   },
//   ...
// ]

// 3. Get endpoint details
const details = getEndpointById(schema, 'GET__pet__petId');
console.log(details);
// {
//   id: 'GET__pet__petId',
//   path: '/pet/{petId}',
//   method: 'GET',
//   parameters: [...],
//   responses: {...},
//   security: [...],
//   // ...
// }
```

---

## API Reference

### detectAuth(schema: OpenAPISchema): AuthInfo

Analyzes the OpenAPI schema to identify authentication mechanisms.

**Returns:**
- `type`: One of `'none'`, `'apiKey'`, `'http'`, `'oauth2'`, `'openIdConnect'`, or `'multiple'`
- `schemes`: Array of authentication scheme details
- `globalSecurity`: Optional global security requirements

---

### listEndpoints(schema: OpenAPISchema): EndpointInfo[]

Lists all available endpoints in the schema.

**Returns array of:**
- `id`: Unique identifier for the endpoint (e.g., `'GET__pet__petId'`)
- `path`: The URL path template
- `method`: HTTP method (uppercase)
- `summary`: Optional endpoint summary
- `description`: Optional endpoint description
- `operationId`: Optional operation identifier
- `tags`: Optional array of tags

---

### getEndpointById(schema: OpenAPISchema, id: string): EndpointDetails | null

Retrieves complete endpoint details by its unique identifier.

**Returns:**
- All fields from `EndpointInfo` plus:
- `parameters`: Array of parameter definitions
- `requestBody`: Request body schema
- `responses`: Response definitions
- `security`: Endpoint-specific security requirements

---

## Development

```bash
# Install dependencies
pnpm install

# Type check
pnpm tsc --noEmit
```

---

## Assumptions

- Input is a pre-parsed, valid OpenAPI schema object (no validation performed)
- Supports OpenAPI 3.x schemas
- TypeScript types are simplified for common use cases

---

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to open an issue or submit a pull request.

---