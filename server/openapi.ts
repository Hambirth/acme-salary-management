const error = {
  description: "Error response with error, code, success=false and requestId",
  content: {
    "application/json": { schema: { $ref: "#/components/schemas/Error" } },
  },
};
const responses = {
  "200": { description: "Success" },
  "400": error,
  "401": error,
  "403": error,
  "404": error,
  "409": error,
  "429": error,
};
const query = (name: string, type = "string", values?: string[]) => ({
  name,
  in: "query",
  schema: { type, ...(values ? { enum: values } : {}) },
});
const filters = [
  query("search"),
  query("country"),
  query("department"),
  query("jobTitle"),
  query("currency", "string", ["INR", "USD", "GBP", "EUR", "SGD", "CAD"]),
];
const body = (schema: object) => ({
  required: true,
  content: { "application/json": { schema } },
});
const operation = (summary: string, extra: object = {}) => ({
  summary,
  responses,
  ...extra,
});
const id = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "integer", minimum: 1 },
};
export const openApi = {
  openapi: "3.0.3",
  info: {
    title: "ACME Salary Management API",
    version: "2.0.0",
    description:
      "Synthetic assessment demo. Cookie sessions; writes require X-Acme-Request: 1. HR role grants writes, individual salaries, logs and audit. Viewers get salary-free directory/CSV, aggregate groups of 5+, no min/max, bands or outliers. Money and statistics are integer minor units (percentiles may be fractional).",
  },
  servers: [{ url: "/api" }],
  security: [{ cookieAuth: [] }],
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "acme_session" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          success: { type: "boolean" },
          code: { type: "string" },
          requestId: { type: "string" },
          fields: { type: "array", items: { type: "string" } },
        },
      },
      EmployeeInput: {
        type: "object",
        required: [
          "name",
          "email",
          "country",
          "department",
          "jobTitle",
          "employmentType",
          "salary",
          "joiningDate",
        ],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100 },
          email: { type: "string", format: "email" },
          country: {
            type: "string",
            enum: [
              "India",
              "United States",
              "United Kingdom",
              "Germany",
              "Singapore",
              "Canada",
            ],
          },
          department: { type: "string" },
          jobTitle: { type: "string" },
          employmentType: {
            type: "string",
            enum: ["Full-time", "Part-time", "Contract"],
          },
          salary: {
            type: "string",
            pattern: "^\\d{1,9}(\\.\\d{1,2})?$",
            example: "125000.50",
            description: "Positive annual base pay in local major units",
          },
          joiningDate: { type: "string", format: "date" },
          version: {
            type: "integer",
            description: "Required for update; stale version returns 409",
          },
        },
      },
    },
  },
  paths: {
    "/health": { get: operation("Database health", { security: [] }) },
    "/auth/login": {
      post: operation("Create an eight-hour cookie session", {
        security: [],
        requestBody: body({
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
          },
        }),
      }),
    },
    "/auth/register": {
      post: operation("Register a synthetic demo account; default VIEWER", {
        security: [],
        requestBody: body({
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 12 },
            role: {
              type: "string",
              enum: ["VIEWER", "HR_MANAGER"],
              default: "VIEWER",
            },
          },
        }),
        responses: {
          ...responses,
          "201": { description: "Account created and signed in" },
        },
      }),
    },
    "/auth/me": { get: operation("Current session user") },
    "/auth/logout": {
      post: operation("Revoke session", {
        responses: { ...responses, "204": { description: "Signed out" } },
      }),
    },
    "/options": { get: operation("Countries, departments and job titles") },
    "/employees": {
      get: operation("Filtered paginated directory; viewer salaries omitted", {
        parameters: [
          ...filters,
          query("page", "integer"),
          query("pageSize", "integer"),
          query("sort", "string", ["name", "salary", "joiningDate"]),
          query("direction", "string", ["asc", "desc"]),
        ],
      }),
      post: operation("Create employee (HR)", {
        requestBody: body({ $ref: "#/components/schemas/EmployeeInput" }),
        responses: { ...responses, "201": { description: "Created employee" } },
      }),
    },
    "/employees/{id}": {
      parameters: [id],
      get: operation("Employee detail; viewer salary omitted"),
      put: operation("Update employee (HR); optimistic version required", {
        requestBody: body({ $ref: "#/components/schemas/EmployeeInput" }),
      }),
      delete: operation("Delete employee (HR); optimistic version required", {
        requestBody: body({
          type: "object",
          required: ["version"],
          properties: { version: { type: "integer", minimum: 1 } },
        }),
        responses: { ...responses, "204": { description: "Deleted" } },
      }),
    },
    "/employees/export": {
      get: operation("Filtered CSV; viewer salary column omitted", {
        parameters: filters,
        responses: {
          "200": {
            description: "CSV download",
            content: { "text/csv": { schema: { type: "string" } } },
          },
          "401": error,
        },
      }),
    },
    "/insights": {
      get: operation(
        "Salary statistics, headcount, tenure, bands and HR peer outliers",
        {
          parameters: [
            ...filters,
            query("groupBy", "string", [
              "country",
              "department",
              "jobTitle",
              "employmentType",
            ]),
            query("view", "string", ["local", "usd"]),
          ],
          description:
            "Local defaults to INR. view=usd combines currencies using labeled illustrative static rates, rounded per employee to cents; an optional currency filter limits source currency. Tenure reference date is returned. Outlier fences always use original currencies and like-for-like peers.",
        },
      ),
    },
    "/audit": {
      get: operation("Latest 100 transactional changes with request IDs (HR)"),
    },
    "/logs": { get: operation("Latest 100 redacted application logs (HR)") },
    "/openapi.json": { get: operation("This specification") },
  },
};
