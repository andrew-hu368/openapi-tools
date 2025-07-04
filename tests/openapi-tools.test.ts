import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
	type AuthInfo,
	AuthInfoSchema,
	detectAuth,
	type EndpointDetails,
	EndpointDetailsSchema,
	type EndpointInfo,
	EndpointInfoSchema,
	getEndpointById,
	listEndpoints,
	type OpenAPISchema,
} from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test fixtures
async function loadFixture(filename: string): Promise<OpenAPISchema> {
	const fixturePath = join(__dirname, "./fixtures", filename);
	const content = await readFile(fixturePath, "utf-8");
	return JSON.parse(content) as OpenAPISchema;
}

describe("OpenAPI Tools", () => {
	describe("detectAuth", () => {
		test("should detect OAuth2 authentication in petstore3.json", async () => {
			const schema = await loadFixture("petstore3.json");
			const authInfo: AuthInfo = detectAuth(schema);

			assert.equal(authInfo.type, "multiple");
			assert.equal(authInfo.schemes.length, 2);

			const oauth2Scheme = authInfo.schemes.find(
				(s) => s.name === "petstore_auth",
			);
			assert(oauth2Scheme);
			assert.equal(oauth2Scheme.type, "oauth2");
			assert.equal(
				oauth2Scheme.details.flows.implicit.authorizationUrl,
				"https://petstore3.swagger.io/oauth/authorize",
			);
			assert.deepEqual(oauth2Scheme.details.flows.implicit.scopes, {
				"write:pets": "modify pets in your account",
				"read:pets": "read your pets",
			});
		});

		test("should detect API key authentication in petstore3.json", async () => {
			const schema = await loadFixture("petstore3.json");
			const authInfo: AuthInfo = detectAuth(schema);

			const apiKeyScheme = authInfo.schemes.find((s) => s.name === "api_key");
			assert(apiKeyScheme);
			assert.equal(apiKeyScheme.type, "apiKey");
			assert.equal(apiKeyScheme.details.in, "header");
			assert.equal(apiKeyScheme.details.parameterName, "api_key");
		});

		test("should detect multiple authentication types in petstore31.json", async () => {
			const schema = await loadFixture("petstore31.json");
			const authInfo: AuthInfo = detectAuth(schema);

			assert.equal(authInfo.type, "multiple");
			assert.equal(authInfo.schemes.length, 3);

			const schemeNames = authInfo.schemes.map((s) => s.name);
			assert.deepEqual(schemeNames.sort(), [
				"api_key",
				"mutual_tls",
				"petstore_auth",
			]);
		});

		test("should detect mutualTLS authentication in petstore31.json", async () => {
			const schema = await loadFixture("petstore31.json");
			const authInfo: AuthInfo = detectAuth(schema);

			const mutualTlsScheme = authInfo.schemes.find(
				(s) => s.name === "mutual_tls",
			);
			assert(mutualTlsScheme);
			assert.equal(mutualTlsScheme.type, "mutualTLS");
		});

		test("should handle schema without security schemes", () => {
			const schema: OpenAPISchema = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0.0" },
				paths: {},
			};
			const authInfo: AuthInfo = detectAuth(schema);

			assert.equal(authInfo.type, "none");
			assert.equal(authInfo.schemes.length, 0);
		});

		test("should preserve global security requirements", async () => {
			const schema = await loadFixture("petstore3.json");
			const authInfo: AuthInfo = detectAuth(schema);

			assert.equal(authInfo.globalSecurity, undefined);
		});
	});

	describe("listEndpoints", () => {
		test("should list all endpoints from petstore3.json", async () => {
			const schema = await loadFixture("petstore3.json");
			const endpoints: EndpointInfo[] = listEndpoints(schema);

			assert.equal(endpoints.length, 19);

			// Check specific endpoint
			const addPetEndpoint = endpoints.find((e) => e.operationId === "addPet");
			assert(addPetEndpoint);
			assert.equal(addPetEndpoint.path, "/pet");
			assert.equal(addPetEndpoint.method, "POST");
			assert.equal(addPetEndpoint.summary, "Add a new pet to the store.");
			assert.equal(addPetEndpoint.description, "Add a new pet to the store.");
			assert.deepEqual(addPetEndpoint.tags, ["pet"]);
		});

		test("should list all endpoints from petstore31.json", async () => {
			const schema = await loadFixture("petstore31.json");
			const endpoints: EndpointInfo[] = listEndpoints(schema);

			assert.equal(endpoints.length, 3);

			// Check endpoint with parameters
			const getPetByIdEndpoint = endpoints.find(
				(e) => e.operationId === "getPetById",
			);
			assert(getPetByIdEndpoint);
			assert.equal(getPetByIdEndpoint.path, "/pet/{petId}");
			assert.equal(getPetByIdEndpoint.method, "GET");
			assert.equal(getPetByIdEndpoint.summary, "Find pet by it's identifier.");
			assert.deepEqual(getPetByIdEndpoint.tags, ["pet"]);
		});

		test("should generate consistent IDs for endpoints", async () => {
			const schema = await loadFixture("petstore3.json");
			const endpoints: EndpointInfo[] = listEndpoints(schema);

			// Test ID generation for different paths
			const updatePet = endpoints.find(
				(e) => e.path === "/pet" && e.method === "PUT",
			);
			assert(updatePet);
			assert.equal(updatePet.id, "PUT__pet");

			const getPetById = endpoints.find(
				(e) => e.path === "/pet/{petId}" && e.method === "GET",
			);
			assert(getPetById);
			assert.equal(getPetById.id, "GET__pet__petId");

			const findByStatus = endpoints.find(
				(e) => e.path === "/pet/findByStatus" && e.method === "GET",
			);
			assert(findByStatus);
			assert.equal(findByStatus.id, "GET__pet_findByStatus");
		});

		test("should handle schema without paths", () => {
			const schema: OpenAPISchema = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0.0" },
				components: {
					securitySchemes: {},
				},
			};
			const endpoints: EndpointInfo[] = listEndpoints(schema);

			assert.equal(endpoints.length, 0);
		});

		test("should include all HTTP methods", async () => {
			const schema = await loadFixture("petstore3.json");
			const endpoints: EndpointInfo[] = listEndpoints(schema);

			const methods = [...new Set(endpoints.map((e) => e.method))];
			assert(methods.includes("GET"));
			assert(methods.includes("POST"));
			assert(methods.includes("PUT"));
			assert(methods.includes("DELETE"));
		});
	});

	describe("getEndpointById", () => {
		test("should retrieve endpoint by ID from petstore3.json", async () => {
			const schema = await loadFixture("petstore3.json");

			const endpoint: EndpointDetails | null = getEndpointById(
				schema,
				"POST__pet",
			);
			assert(endpoint);
			assert.equal(endpoint.path, "/pet");
			assert.equal(endpoint.method, "POST");
			assert.equal(endpoint.operationId, "addPet");
			assert(endpoint.requestBody);
			assert(endpoint.responses);
			assert(endpoint.security);
		});

		test("should retrieve endpoint with parameters from petstore31.json", async () => {
			const schema = await loadFixture("petstore31.json");

			const endpoint: EndpointDetails | null = getEndpointById(
				schema,
				"GET__pet__petId",
			);
			assert(endpoint);
			assert.equal(endpoint.path, "/pet/{petId}");
			assert.equal(endpoint.method, "GET");
			assert.equal(endpoint.operationId, "getPetById");
			assert(endpoint.parameters);
			assert.equal(endpoint.parameters.length, 1);
			assert.equal(endpoint.parameters[0].name, "petId");
			assert.equal(endpoint.parameters[0].in, "path");
		});

		test("should include request body details", async () => {
			const schema = await loadFixture("petstore3.json");

			const endpoint: EndpointDetails | null = getEndpointById(
				schema,
				"PUT__pet",
			);
			assert(endpoint);
			assert(endpoint.requestBody);
			assert("content" in endpoint.requestBody);
			assert(endpoint.requestBody.content["application/json"]);
			assert(endpoint.requestBody.content["application/xml"]);
		});

		test("should include response details", async () => {
			const schema = await loadFixture("petstore3.json");

			const endpoint: EndpointDetails | null = getEndpointById(
				schema,
				"GET__pet_findByStatus",
			);
			assert(endpoint);
			assert(endpoint.responses);
			assert(endpoint.responses["200"]);
			assert(endpoint.responses["400"]);
			assert.equal(
				endpoint.responses["200"].description,
				"successful operation",
			);
		});

		test("should include security requirements", async () => {
			const schema = await loadFixture("petstore31.json");

			const endpoint: EndpointDetails | null = getEndpointById(
				schema,
				"PUT__pet",
			);
			assert(endpoint);
			assert(endpoint.security);
			assert.equal(endpoint.security.length, 1);
			assert(endpoint.security[0].petstore_auth);
			assert.deepEqual(endpoint.security[0].petstore_auth, [
				"write:pets",
				"read:pets",
			]);
		});

		test("should return null for non-existent endpoint ID", async () => {
			const schema = await loadFixture("petstore3.json");

			const endpoint: EndpointDetails | null = getEndpointById(
				schema,
				"INVALID_ID",
			);
			assert.equal(endpoint, null);
		});

		test("should return null for malformed ID", async () => {
			const schema = await loadFixture("petstore3.json");

			const endpoint: EndpointDetails | null = getEndpointById(
				schema,
				"INVALID",
			);
			assert.equal(endpoint, null);
		});

		test("should handle schema without paths", () => {
			const schema: OpenAPISchema = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0.0" },
				components: {
					securitySchemes: {},
				},
			};

			const endpoint: EndpointDetails | null = getEndpointById(
				schema,
				"GET__pet",
			);
			assert.equal(endpoint, null);
		});
	});

	describe("Integration tests with both fixtures", () => {
		test("should handle OpenAPI 3.0 and 3.1 schemas", async () => {
			const schema30 = await loadFixture("petstore3.json");
			const schema31 = await loadFixture("petstore31.json");

			assert.equal(schema30.openapi, "3.0.4");
			assert.equal(schema31.openapi, "3.1.0");

			// Both should work with our functions
			const auth30: AuthInfo = detectAuth(schema30);
			const auth31: AuthInfo = detectAuth(schema31);
			assert(auth30.schemes.length > 0);
			assert(auth31.schemes.length > 0);

			const endpoints30: EndpointInfo[] = listEndpoints(schema30);
			const endpoints31: EndpointInfo[] = listEndpoints(schema31);
			assert.equal(endpoints30.length, 19);
			assert.equal(endpoints31.length, 3);
		});

		test("should handle different schema structures", async () => {
			const schema30 = await loadFixture("petstore3.json");
			const schema31 = await loadFixture("petstore31.json");

			// Check that both schemas have different endpoint counts
			const endpoints30: EndpointInfo[] = listEndpoints(schema30);
			const endpoints31: EndpointInfo[] = listEndpoints(schema31);

			// petstore3.json has more endpoints (includes store and user)
			assert.equal(endpoints30.length, 19);
			assert.equal(endpoints31.length, 3);

			// petstore31.json has only pet endpoints
			const tags31 = [...new Set(endpoints31.flatMap((e) => e.tags || []))];
			assert.deepEqual(tags31, ["pet"]);

			// petstore3.json has multiple tags
			const tags30 = [...new Set(endpoints30.flatMap((e) => e.tags || []))];
			assert(tags30.includes("pet"));
			assert(tags30.includes("store"));
			assert(tags30.includes("user"));
		});
	});

	describe("Zod Schema Validation", () => {
		test("should validate AuthInfo with Zod schema", async () => {
			const schema = await loadFixture("petstore3.json");
			const authInfo: AuthInfo = detectAuth(schema);

			// Validate using Zod schema - should not throw
			const result = AuthInfoSchema.parse(authInfo);
			assert.deepEqual(result, authInfo);
		});

		test("should validate EndpointInfo array with Zod schema", async () => {
			const schema = await loadFixture("petstore3.json");
			const endpoints: EndpointInfo[] = listEndpoints(schema);

			// Validate using Zod schema - should not throw
			const result = z.array(EndpointInfoSchema).parse(endpoints);
			assert.deepEqual(result, endpoints);
			assert.equal(result.length, 19);
		});

		test("should validate individual EndpointInfo with Zod schema", async () => {
			const schema = await loadFixture("petstore31.json");
			const endpoints: EndpointInfo[] = listEndpoints(schema);
			const firstEndpoint = endpoints[0];
			assert(firstEndpoint);

			// Validate using Zod schema - should not throw
			const result = EndpointInfoSchema.parse(firstEndpoint);
			assert.deepEqual(result, firstEndpoint);
		});

		test("should validate EndpointDetails with Zod schema", async () => {
			const schema = await loadFixture("petstore3.json");
			const endpoint: EndpointDetails | null = getEndpointById(
				schema,
				"POST__pet",
			);
			assert(endpoint);

			// Validate using Zod schema - should not throw
			const result = EndpointDetailsSchema.parse(endpoint);
			assert.deepEqual(result, endpoint);
		});

		test("should handle optional fields in Zod validation", async () => {
			const schema = await loadFixture("petstore31.json");
			const authInfo: AuthInfo = detectAuth(schema);
			const endpoints: EndpointInfo[] = listEndpoints(schema);

			// Test that optional fields are handled correctly
			const validatedAuth = AuthInfoSchema.parse(authInfo);
			const validatedEndpoints = z.array(EndpointInfoSchema).parse(endpoints);

			assert(validatedAuth);
			assert(validatedEndpoints);
			assert.equal(validatedEndpoints.length, 3);
		});

		test("should reject invalid data with Zod schema", () => {
			const invalidAuthInfo = {
				type: "invalid_type",
				schemes: "not_an_array",
			};

			assert.throws(() => {
				AuthInfoSchema.parse(invalidAuthInfo);
			});
		});
	});
});
