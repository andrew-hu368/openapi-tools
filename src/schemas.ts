import { z } from "zod";

// Zod schema for authentication scheme
export const AuthSchemeSchema = z.object({
	name: z.string().describe("Name of the authentication scheme"),
	type: z
		.string()
		.describe("Type of authentication (apiKey, oauth2, http, etc.)"),
	description: z
		.string()
		.optional()
		.describe("Description of the authentication scheme"),
	details: z
		.record(z.any())
		.describe("Additional details specific to the authentication type"),
});

// Zod schema for authentication information
export const AuthInfoSchema = z.object({
	type: z
		.enum(["none", "apiKey", "http", "oauth2", "openIdConnect", "multiple"])
		.describe(
			'Primary authentication type or "multiple" if multiple schemes exist',
		),
	schemes: z
		.array(AuthSchemeSchema)
		.describe("Array of authentication schemes available in the API"),
	globalSecurity: z
		.array(z.record(z.array(z.string())))
		.optional()
		.describe("Global security requirements that apply to all operations"),
});

// Zod schema for endpoint information (summary view)
export const EndpointInfoSchema = z.object({
	id: z.string().describe("Unique identifier for the endpoint (METHOD__path)"),
	path: z.string().describe("API path for the endpoint"),
	method: z.string().describe("HTTP method (GET, POST, PUT, DELETE, etc.)"),
	summary: z
		.string()
		.optional()
		.describe("Brief summary of what the endpoint does"),
	description: z
		.string()
		.optional()
		.describe("Detailed description of the endpoint"),
	operationId: z.string().optional().describe("Unique operation identifier"),
	tags: z
		.array(z.string())
		.optional()
		.describe("Tags associated with the endpoint"),
});

// Zod schema for endpoint details (full view)
export const EndpointDetailsSchema = EndpointInfoSchema.extend({
	parameters: z
		.array(z.any())
		.optional()
		.describe("Parameters accepted by the endpoint"),
	requestBody: z
		.any()
		.optional()
		.describe("Request body schema and requirements"),
	responses: z
		.record(z.any())
		.optional()
		.describe("Response schemas by status code"),
	security: z
		.array(z.record(z.array(z.string())))
		.optional()
		.describe("Security requirements specific to this endpoint"),
});

// Export types derived from schemas for consistency
export type AuthScheme = z.infer<typeof AuthSchemeSchema>;
export type AuthInfo = z.infer<typeof AuthInfoSchema>;
export type EndpointInfo = z.infer<typeof EndpointInfoSchema>;
export type EndpointDetails = z.infer<typeof EndpointDetailsSchema>;
