# Express API

Node.js 26.13.0 LTS, npm 12.2.2, Express 5, TypeScript. Use the same project toolchain for the client and server. The API does not import frontend source code; the Node entry point also serves the built frontend when `client/dist` is present.

## Local setup

From the repository root:

```sh
npm ci
npm run install:apps
```

Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` to your MongoDB database. MongoDB is the only product source. `OPENAI_API_KEY` is optional: when absent, valid chat requests return 503, while products work normally. Never put these credentials in `client/` or a `VITE_*` variable.

```sh
npm run dev
```

Starts API on http://127.0.0.1:3001 and Vite on http://localhost:5173. Open the Vite address during development: it serves the frontend and proxies `/api` to Express. Both processes are stopped when either exits. Separate commands: npm run dev:server and npm run dev:client.

## API

Account favorites are available under `/api/me/favorites`: GET reads the current
user's list; PUT/DELETE `/items/:productId` add/remove; POST `/merge` imports guest IDs;
PUT `/order` saves a revision-checked permutation. All require verified Clerk
session tokens and return `{ ids, revision }` with private/no-store caching.
Prepare the new collection with `npm run setup:favorites` against the intended
database. See [setup and full contract](../docs/favorites-setup.md).

Authentication uses `@clerk/express`. Configure `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` together; optional `CLERK_JWT_KEY` enables networkless JWT verification. With no keys, public browsing works and protected requests fail closed with 503. See [Clerk setup](../docs/clerk-setup.md) for admin metadata and the `role` session claim.

`GET /api/me` requires a valid session and returns `{ userId, role }`. `requireUser` and `requireAdmin` in `src/middleware/auth.ts` return JSON 401/403, use only verified session claims, and set private/no-store caching. Product POST requires a signed-in user; PATCH/DELETE atomically require the owner or Admin; see [CRUD contract](../docs/products-crud.md). CORS permits bearer Authorization and GET/POST/PUT/PATCH/DELETE/OPTIONS for configured origins; those origins also define Clerk `authorizedParties`.

| Method | Endpoint              | Response                                       |
| ------ | --------------------- | ---------------------------------------------- |
| GET    | /api/health           | Process liveness, not an upstream health check |
| GET    | /api/products         | Product array                                  |
| GET    | /api/products/catalog | Filtered and paginated catalog                 |
| GET    | /api/products/:id     | Product or 404                                 |
| POST   | /api/products         | Signed-in user: 201 + created Product          |
| PATCH  | /api/products/:id     | Owner/Admin: updated Product; 403/404 on denial |
| DELETE | /api/products/:id     | Owner/Admin: 204 without body; 403/404          |
| POST   | /api/chat             | AI SDK UI message SSE stream                   |

The `/api/health` handler returns `{ status: 'ok' }` without querying MongoDB or OpenAI. The Node server connects to MongoDB before listening. On Vercel, every route, including health, first passes through application initialization: a failed initial database connection returns 503. Once initialized, health does not detect a later database outage. It is not a complete dependency health check.

The list contains documents with catalogOrder >= 0, ordered by catalogOrder and then string ID. Detail can also retrieve products outside the storefront. The gallery uses the optional admin imageUrls override, or imported Cloudinary secureUrl values when no override exists; an empty gallery returns images=[] and image=''. The catalog endpoint documented below adds filtering and pagination. The list and detail endpoints use explicit /api/products routes; no legacy aliases are registered.

Chat accepts a messages array of user/assistant UI messages with id and text/reasoning parts. The final user message must contain metadata.productId. The server loads product facts by ID, retains the o4-mini model, validates input, limits request size, aborts generation on disconnect and returns safe streaming error messages. It does not accept client-supplied system prompts.

Errors before streaming are JSON { error: string }: 400 invalid input/JSON, 403 disallowed Origin, 404 missing record/endpoint, 413 oversized body, 502 invalid stored product data, 503 unavailable MongoDB/unconfigured chat, 504 database timeout, 500 unexpected errors. Provider errors after stream headers use the UI stream error event. Raw provider responses and credentials are never returned. MongoDB queries time out after 15 seconds; model streaming timeout is 120 seconds.

## Environment variables

For `npm run dev` and `npm start`, the Node entry point loads `server/.env`, resolved relative to the source or compiled entry point. Existing `process.env` values take precedence. It does not load the root `.env`. The Vercel adapter reads the environment supplied by the platform and does not load an env file itself.

| Variable         | Purpose and default                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MONGODB_URI`    | Required server-side MongoDB connection string.                                                                                                                                       |
| `OPENAI_API_KEY` | Optional server-side key. Without it, valid chat requests return 503; products remain available.                                                                                      |
| `PORT`           | Node listener port; defaults to `3001`. Vercel manages its own listener.                                                                                                              |
| `HOST`           | Node listener address; defaults to `127.0.0.1`. Use `0.0.0.0` when a container must accept external connections.                                                                      |
| `CORS_ORIGINS`   | Comma-separated exact frontend origins, without trailing slashes. Defaults allow `localhost` and `127.0.0.1` on ports `5173` and `4173`.                                              |
| `VITE_API_URL`   | Optional **client build setting**, not server configuration. Public backend origin without `/api`; unset means requests to `/api` on the frontend origin. Never put credentials here. |

Set client variables in `client/.env` or the frontend build environment. Vite includes `VITE_*` values in the client bundle.

The environment parser validates values and produces errors containing variable names rather than values. The Node entry point catches startup failures and prints a generic safe message; Vercel returns a safe 503.

CORS permits configured origins and requests without an `Origin` header. It does not enable wildcards or credentials mode, and it is not authentication. The Vercel adapter additionally allows origins from `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, and `VERCEL_BRANCH_URL`. It reads these platform settings, not request headers.

## Product ownership

New products store immutable ownerId from the verified Clerk session. Existing
products without an owner are not backfilled; only Admin can change them.
Public Product responses do not expose owner IDs. Authenticated
GET /api/me/products returns only the session user's products in catalogOrder/_id
order with private/no-store caching; query parameters cannot select another owner.
The frontend now provides `/my-products` for signed-in users and owner/Admin
controls on product pages. `/admin/products` provides the moderation panel.
GET `/api/admin/products` requires a verified admin claim and returns
`{ product, ownerId: string | null, createdAt: string | null }[]` with private/no-store
caching, newest creation dates first and ID as a tiebreaker; missing dates sort
last. Public DTOs stay unchanged. This read performs no backfill or document writes.

Run npm run setup:products explicitly against the intended environment to create
the product_owner_catalog_order index. This reads server/.env (process environment
takes precedence); it neither rewrites documents nor drops indexes. Runtime
autoIndex stays disabled. The setup was verified only on temporary test MongoDB.

## Build and run with Node

From the repository root:

```sh
npm run build
npm start
```

`npm run build` compiles the server into `server/dist` and the frontend into `client/dist`. `npm start` runs Express at http://127.0.0.1:3001 by default. It connects to MongoDB before listening and serves both the API and the built frontend. Frontend history URLs fall back to `index.html`; unknown `/api` routes return JSON 404 responses before that fallback. Keep `VITE_API_URL` unset to use this shared origin.

`npm run build:apps` remains a compatibility alias for `npm run build`. `npm run preview` starts only Vite's build preview on port 4173; API requests still need a running backend. If you change the backend port, also update the Vite proxy target through the client `VITE_API_URL` setting.

## Vercel and separate hosting

For the current Vercel deployment, `vercel.json` builds both applications. Vercel serves the frontend files and routes `/api` through `api/index.mjs` to `server/dist/vercel.js`. The adapter initializes the application on its first request and reuses it and the database pool on later requests in the same instance. Failed initialization can be retried by the next request. It neither opens a listener nor serves `client/dist`.

Set server variables in the Vercel project environment for the intended deployment environment. Keep `VITE_API_URL` unset for same-origin requests. Local env files and verification artifacts are excluded from upload; `server/.env` is not a production configuration source.

For separate frontend and backend hosts, set the client's `VITE_API_URL` before building and add the frontend origin to the backend's `CORS_ORIGINS`. Alternatively, keep `/api` on the frontend origin and configure that host to proxy it to Express. A separate static host must serve `index.html` for frontend history URLs while keeping API requests out of that fallback.

## Structure and checks

| File or directory                  | Responsibility                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                     | Loads Node configuration, starts the listener and closes HTTP connections and MongoDB on shutdown.                  |
| `src/vercel.ts`                    | Initializes and reuses the application for Vercel requests.                                                         |
| `src/runtime.ts`                   | Connects MongoDB and supplies the real product service and optional AI model to `createApp`.                        |
| `src/app.ts`                       | Registers CORS, JSON parsing, routes, optional frontend files, 404 responses and error handling. Does not listen.   |
| `src/config/env.ts`                | Parses and validates environment variables.                                                                         |
| `src/config/database.ts`           | Owns the shared MongoDB connection and translates connection/query failures into safe API errors.                   |
| `src/routes/`                      | Handles HTTP requests. These small handlers already serve the role of controllers.                                  |
| `src/services/products.ts`         | Defines the product response type and the `list`/`get` service contract. Tests can supply their own implementation. |
| `src/services/mongodb-products.ts` | Queries MongoDB, validates stored data and converts it to API products.                                             |
| `src/services/catalog.ts`          | Filters, sorts and paginates the product list.                                                                      |
| `src/models/product.ts`            | Defines the stored product schema and registers it on a Mongoose connection.                                        |
| `src/middleware/errors.ts`         | Produces safe JSON error responses.                                                                                 |

A product request follows `app → products route → MongoDB service → model`, then the service converts the result to the API response. Chat uses the same product service to load product facts before calling the AI model.

From the repository root:

```sh
npm --prefix server run typecheck
npm --prefix server run lint
npm --prefix server test
npm --prefix server run build
npm --prefix client run typecheck
npm --prefix client run lint
npm --prefix client test
npm --prefix client run build
```

Unit tests use real local HTTP requests to Express with controlled product services/model responses. Integration tests use a separate local mongod selected by MONGODB_TEST_BINARY: npm --prefix server run test:mongodb. Streaming tests verify the UI protocol and safe provider errors without paid model requests.

### Public chat limits

Chat admission uses a shared MongoDB document in `chat_admission` (`_id: global`),
with revision-based atomic updates. The database user needs read/write access
to that collection. MongoDB's built-in `_id` index is sufficient; no setup script
or new dependency is required. Missing/unavailable admission storage fails closed
with 503 before contacting the model.

- `CHAT_REQUESTS_PER_MINUTE`: default 30, range 1–1000, rolling 60-second window.
- `CHAT_MAX_CONCURRENT`: default 4, range 1–100.
- `CHAT_MAX_HISTORY_CHARACTERS`: default 12000, range 100–50000 (UTF-16 characters).
- `CHAT_MAX_OUTPUT_TOKENS`: default 2048, range 128–8192; reasoning may consume this budget.

Use identical settings and synchronized clocks on instances sharing a database.
These are global limits across guests and signed-in users, not per-user fairness
or a monetary account budget. Infrastructure abuse controls may supplement them.
No client-provided identity/IP header controls the quota. Exhaustion returns
429 with `Retry-After: 60`; overlong text/reasoning history returns 413 and the
client offers a new conversation. Accepted failures consume rate quota too.

Streaming slots are released on completion/error/disconnect. Generation aborts
after 120 seconds including admission/product lookup; crashed-worker leases
expire after 150 seconds. A failed release safely leaves the lease to expire.
External providers must honor cancellation; this cannot stop work inside a
provider that ignores cancellation. Automatic provider retries are disabled.
Instructions include only bounded product text and price, never image payloads.

The normal test suite covers quotas with a shared CAS store and local HTTP/model
fixtures. Real MongoDB race/outage coverage is part of `test:mongodb`, using a
temporary local database rather than the configured application database.

## Parameterized catalog

`GET /api/products/home` supplies the compact initial storefront data:
`{ categories: string[], featured: { id, name, image }[] }`. Only visible products
participate. Categories retain first-occurrence order from catalogOrder/ID,
including blank labels and distinct casing. Featured contains the first five
products in that same order, with only their first effective image; an explicit
empty gallery override remains empty. Descriptions, prices, complete galleries,
ownership and notification fields are excluded.

MongoDB groups categories and projects the five slides before returning data;
the endpoint never calls the legacy list service. Category grouping still scans
catalog metadata and grows with the number of unique categories. The two reads
are not a transactional snapshot. Errors fail closed (503/504, or 502 for an
invalid projected response), rather than falling back to the full catalog.
Existing index preparation covers the storefront ordering; stage 7 adds no new
indexes or migrations. The legacy list and detail endpoints remain available.

GET /api/products/catalog accepts text, repeated category, price, sort, page and pageSize. Returns { items, total, page, pageSize, min_price, max_price }. It filters/sorts/pages the MongoDB storefront; existing unfiltered list and detail endpoints are preserved. Invalid values use defaults (sort=price-lowest, page=1, pageSize=6; maximum pageSize=100). Bounds describe the unfiltered result. See the [client catalog URL rules](../client/README.md#catalog-url).

The catalog delegates to `CatalogProductsService.catalog`; it never loads the
legacy full product list. MongoDB filters visible records (`catalogOrder >= 0`),
counts matches, sorts and selects only the requested page's public DTO fields.
Global min/max price use two one-record reads. Images remain separate documents
in the cursor, so an image-heavy page is not constrained by a single BSON
aggregation document's 16 MiB limit.

Text search is an escaped, case-insensitive literal prefix (MongoDB PCRE2), and
category matching is exact, including case and punctuation. Name sorting uses
explicit English ICU collation at strength 3 rather than the Node host's default
locale. Equal values sort by ascending catalogOrder then ID. Unusual Unicode
case folding/ordering can differ from JavaScript toLowerCase/localeCompare and
between ICU versions; ASCII and accented-name contract fixtures are covered.
Generated IDs are ASCII. Externally imported Unicode IDs that are canonically
equivalent can still compare equal in a name-sort tie with the same catalogOrder;
such imports need distinct catalogOrder values for deterministic ordering.

Count, bounds and page reads are not a transactional snapshot. A concurrent
deletion that shortens a page triggers one recount/retry; continuous changes
return a safe 503. Concurrent inserts or price edits can appear on the next
request. Each DB operation retains the existing 15-second timeout.

Run `npm --prefix server run setup:products` against the intended database during
deployment preparation to add `product_catalog_price` (price, catalogOrder, ID;
visible records only) and ensure the existing catalogOrder index. Runtime still
uses `autoIndex: false`; it does not create indexes. Setup is additive and retains
ownership/notification indexes and documents. The price index supports the
default ascending page and global bounds. Other sort/filter combinations and
deep offsets may still scan/sort: add further indexes only after representative
`explain('executionStats')` measurements. The integration suite measures a
2,000-record fixture against a forced collection scan; this is not a production
latency benchmark.

References: [MongoDB collation](https://www.mongodb.com/docs/manual/reference/collation/),
[partial indexes](https://www.mongodb.com/docs/manual/core/index-partial/),
[regex semantics](https://www.mongodb.com/docs/manual/reference/operator/query/regex/).

## Recovery

Product creation persists a notification job in the same MongoDB document and
awaits the first Telegram attempt without rolling back publication on delivery failure.
The separate secret-protected scheduler route is
`GET /api/internal/product-notifications`; Admins can retry through
`POST /api/admin/products/:id/notification/retry`. See
[notification configuration and activation](../docs/product-notifications.md).
`setup:products` now also prepares the notification due-job index; it never
backfills notifications for existing products.

See the [stage 6 report](../docs/implementation/user-products-stage-6.md) for
isolated MongoDB/HTTP authorization checks and remaining production setup.

For an application regression, restore a verified MongoDB deployment on Vercel, then check `/api/products`, `/api/products/catalog`, product details, images and chat. Confirm that the restored deployment has the intended environment and access settings.

For damaged data, preserve the current database and logs before restoring from a suitable backup.

## Database failure diagnostics

In Vercel Runtime Logs, search for `MongoDB operation failed` and open the
associated request. Vercel supplies its timestamp and request context.

Each event contains only:

- `operation`: a fixed label such as `database.connect`, `product.create`,
  `product.update`, or `product.delete` (product reads are also covered).
- `connection`: `disconnected`, `connected`, `connecting`, `disconnecting`, or
  `unknown`, sampled when the operation fails.
- `category`: a controlled classification such as `network`, `timeout`,
  `server-selection`, `authentication`, `authorization`, `conflict`, `validation`,
  `dns`, `configuration`, `connection-not-ready`, or `unknown`.
- `durationMs`: elapsed time for the attempted database operation, not the entire
  HTTP request.

The event does not include raw errors, stacks, connection strings, hostnames,
tokens, user IDs, product IDs, query filters, or product data. Unknown errors are
classified as `unknown` rather than serialized. Expected application errors below
500 and cancelled product reads do not produce database failure events.

Connection state alone does not prove reachability: an operation can fail while
the driver still reports `connected`. Categories describe the observed failure,
not a confirmed infrastructure root cause. No retries, API response changes, or
connection recovery changes are introduced by this instrumentation.

These events become available on the hosted site only after deployment of this
change. Existing log retention limits still apply.
