import type { AuthInfo, EndpointDetails, EndpointInfo } from "./schemas.js";
import type {
	OpenAPISchema,
	OperationObject,
	PathItemObject,
	SecuritySchemeObject,
} from "./types.js";

/**
 * Detect authentication types and requirements from an OpenAPI schema
 */
export function detectAuth(schema: OpenAPISchema): AuthInfo {
	const result: AuthInfo = {
		type: "none",
		schemes: [],
		globalSecurity: schema.security,
	};

	// Check for security schemes in components
	if (schema.components?.securitySchemes) {
		const schemes = schema.components.securitySchemes;

		for (const [name, schemeOrRef] of Object.entries(schemes)) {
			// Skip reference objects for now
			if ("$ref" in schemeOrRef) {
				continue;
			}

			const scheme = schemeOrRef as SecuritySchemeObject;
			const schemeInfo = {
				name,
				type: scheme.type,
				description: scheme.description,
				details: {},
			};

			// Add type-specific details
			switch (scheme.type) {
				case "apiKey": {
					const apiKeyScheme = scheme;
					schemeInfo.details = {
						in: apiKeyScheme.in,
						parameterName: apiKeyScheme.name,
					};
					break;
				}
				case "http": {
					const httpScheme = scheme;
					schemeInfo.details = {
						scheme: (httpScheme as { scheme: string }).scheme,
						bearerFormat: (httpScheme as { bearerFormat?: string })
							.bearerFormat,
					};
					break;
				}
				case "oauth2": {
					const oauth2Scheme = scheme;
					schemeInfo.details = {
						flows: (oauth2Scheme as { flows: unknown }).flows,
					};
					break;
				}
				case "openIdConnect": {
					const openIdScheme = scheme as { openIdConnectUrl: string };
					schemeInfo.details = {
						openIdConnectUrl: openIdScheme.openIdConnectUrl,
					};
					break;
				}
			}

			result.schemes.push(schemeInfo);
		}
	}

	// Determine overall auth type
	if (result.schemes.length === 0) {
		result.type = "none";
	} else if (result.schemes.length === 1) {
		const firstScheme = result.schemes[0];
		if (!firstScheme) {
			result.type = "none";
			return result;
		}
		const schemeType = firstScheme.type;
		// Map the security scheme type to AuthInfo type
		if (
			schemeType === "apiKey" ||
			schemeType === "http" ||
			schemeType === "oauth2" ||
			schemeType === "openIdConnect"
		) {
			result.type = schemeType;
		} else {
			result.type = "none";
		}
	} else {
		result.type = "multiple";
	}

	return result;
}

/**
 * List all endpoints with unique identifiers and descriptions
 */
export function listEndpoints(schema: OpenAPISchema): EndpointInfo[] {
	const endpoints: EndpointInfo[] = [];

	if (!schema.paths) {
		return endpoints;
	}

	for (const [path, pathItem] of Object.entries(schema.paths)) {
		if (!pathItem) continue;

		const methods = [
			"get",
			"put",
			"post",
			"delete",
			"options",
			"head",
			"patch",
			"trace",
		] as const;

		for (const method of methods) {
			const operation = pathItem[method] as OperationObject | undefined;
			if (operation) {
				// Generate unique ID from method and path
				// Replace all non-alphanumeric chars with underscore and remove trailing underscores
				const pathId = path.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+$/, "");
				const id = `${method.toUpperCase()}_${pathId}`;

				endpoints.push({
					id,
					path,
					method: method.toUpperCase(),
					summary: operation.summary,
					description: operation.description,
					operationId: operation.operationId,
					tags: operation.tags,
				});
			}
		}
	}

	return endpoints;
}

/**
 * Get complete endpoint schema by unique identifier
 */
export function getEndpointById(
	schema: OpenAPISchema,
	id: string,
): EndpointDetails | null {
	if (!schema.paths) {
		return null;
	}

	// Parse the ID to extract method and path
	const parts = id.split("_");
	if (parts.length < 2) {
		return null;
	}

	const methodPart = parts[0];
	if (!methodPart) {
		return null;
	}
	const method = methodPart.toLowerCase();

	// Try to find the endpoint by matching the ID pattern
	for (const [path, pathItem] of Object.entries(schema.paths)) {
		if (!pathItem) continue;
		const pathId = path.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+$/, "");
		const expectedId = `${method.toUpperCase()}_${pathId}`;

		if (expectedId === id) {
			const operation = pathItem[method as keyof PathItemObject] as
				| OperationObject
				| undefined;

			if (operation && typeof operation === "object") {
				return {
					id,
					path,
					method: method.toUpperCase(),
					summary: operation.summary,
					description: operation.description,
					operationId: operation.operationId,
					tags: operation.tags,
					parameters: operation.parameters,
					requestBody: operation.requestBody,
					responses: operation.responses,
					security: operation.security,
				};
			}
		}
	}

	return null;
}
