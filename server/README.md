# Express API

Node.js 22.12+, Express 5, TypeScript. No dependency on the root package or frontend implementation.

## Local setup

From the repository root:

~~~sh
npm ci
npm run install:apps
~~~

Copy server/.env.example to server/.env and fill in the Airtable credentials. For this workspace, the existing local credentials were copied to ignored server/.env without changing the original files. OPENAI_API_KEY is optional: when absent, chat returns 503, while products work normally. Never put these credentials in client/ or a VITE_* variable.

~~~sh
npm run dev
~~~

Starts API on http://127.0.0.1:3001 and Vite on http://localhost:5173. Both processes are stopped when either exits. Separate commands: npm run dev:server and npm run dev:client. 

## API

| Method | Endpoint | Response |
| --- | --- | --- |
| GET | /api/health | Process liveness, not an upstream health check |
| GET | /api/products | Product array |
| GET | /api/products/:id | Product or 404 |
| POST | /api/chat | AI SDK UI message SSE stream |

List behavior preserves the original Grid view, name ascending and maxRecords=28. Airtable images are decoded from a JSON string; missing images become an empty array and image=''. The catalog endpoint documented below adds filtering and pagination. The list and detail endpoints use explicit /api/products routes; no legacy aliases are registered.

Chat accepts a messages array of user/assistant UI messages with id and text/reasoning parts. The final user message must contain metadata.productId. The server loads product facts by ID, retains the o4-mini model, validates input, limits request size, aborts generation on disconnect and returns safe streaming error messages. It does not accept client-supplied system prompts. Contact has no server implementation in the project and remains unchanged.

Errors before streaming are JSON { error: string }: 400 invalid input/JSON, 403 disallowed Origin, 404 missing record/endpoint, 413 oversized body, 502 invalid or failed upstream response, 503 throttled Airtable/unconfigured chat, 504 Airtable timeout, 500 unexpected errors. Provider errors after stream headers use the UI stream error event. Raw provider responses and credentials are never returned. Airtable timeout is 15 seconds; model streaming timeout is 120 seconds.

## Configuration and deployment

Only server/.env is loaded, resolved relative to the backend entry point in both source and dist. Existing process.env values take precedence. AIRTABLE_API_KEY, AIRTABLE_BASE_ID and AIRTABLE_TABLE_NAME are required at startup. Invalid configuration reports variable names without values.

PORT defaults to 3001; HOST defaults to 127.0.0.1 (set 0.0.0.0 for containers). CORS_ORIGINS is a comma-separated list of exact origins, without trailing slashes. Defaults allow localhost and 127.0.0.1 on 5173 and 4173. No wildcard or credentials mode. Requests without Origin (CLI/reverse proxy) are supported; CORS is not authentication.

Client VITE_API_URL is the public API origin without /api. Empty means same-origin /api: development/preview proxy to port 3001; production needs a reverse proxy. For separate hosting, set VITE_API_URL before building and allow the frontend origin in CORS_ORIGINS. Static frontend hosting must serve index.html for frontend history URLs, excluding /api. Vite preview is only a build-check server.

~~~sh
npm run build:apps
npm --prefix server start
~~~

Root npm run build builds both applications; npm start runs the compiled API. Build artifacts and all local env files are ignored.

## Structure and checks

src/app.ts composes middleware and routers without listening. src/index.ts loads configuration and starts the process. routes/ contains small HTTP handlers; services/products.ts owns Airtable access and normalization; middleware/errors.ts owns JSON error responses. A separate controllers layer would only duplicate these handlers.

~~~sh
npm --prefix server run typecheck
npm --prefix server test
npm --prefix server run build
npm --prefix client run typecheck
npm --prefix client run lint
npm --prefix client test
npm --prefix client run build
~~~

Tests use real local HTTP requests to Express with fake upstream fetch/model responses. Streaming tests verify the UI protocol and safe provider errors without paid model requests.

## Parameterized catalog (stage 5)

GET /api/products/catalog accepts text, repeated category, price, sort, page and pageSize. Returns { items, total, page, pageSize, min_price, max_price }. It filters/sorts/pages the existing 28-record Airtable result; existing unfiltered list and detail endpoints are preserved. Invalid values use defaults (sort=price-lowest, page=1, pageSize=6; maximum pageSize=100). Bounds describe the unfiltered result. See client/docs/url-first-catalog.md.
