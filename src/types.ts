// Import standard OpenAPI types
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";

// Re-export the main OpenAPI schema types for compatibility
export type OpenAPISchema = OpenAPIV3.Document | OpenAPIV3_1.Document;
export type PathItemObject =
	| OpenAPIV3.PathItemObject
	| OpenAPIV3_1.PathItemObject;
export type OperationObject =
	| OpenAPIV3.OperationObject
	| OpenAPIV3_1.OperationObject;
export type SecuritySchemeObject =
	| OpenAPIV3.SecuritySchemeObject
	| OpenAPIV3_1.SecuritySchemeObject;
export type SecurityRequirementObject =
	| OpenAPIV3.SecurityRequirementObject
	| OpenAPIV3_1.SecurityRequirementObject;
