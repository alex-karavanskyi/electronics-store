# Express API

Node.js 22.12+, Express 5, TypeScript. Use Node.js 22.x when running the whole repository. The API does not import frontend source code; the Node entry point also serves the built frontend when `client/dist` is present.

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

| Method | Endpoint              | Response                                       |
| ------ | --------------------- | ---------------------------------------------- |
| GET    | /api/health           | Process liveness, not an upstream health check |
| GET    | /api/products         | Product array                                  |
| GET    | /api/products/catalog | Filtered and paginated catalog                 |
| GET    | /api/products/:id     | Product or 404                                 |
| POST   | /api/chat             | AI SDK UI message SSE stream                   |

The `/api/health` handler returns `{ status: 'ok' }` without querying MongoDB or OpenAI. The Node server connects to MongoDB before listening. On Vercel, every route, including health, first passes through application initialization: a failed initial database connection returns 503. Once initialized, health does not detect a later database outage. It is not a complete dependency health check.

The list contains documents with catalogOrder >= 0, ordered by catalogOrder and then string ID. Detail can also retrieve products outside the storefront. Stored Cloudinary secureUrl values form the image gallery; an empty gallery returns images=[] and image=''. The catalog endpoint documented below adds filtering and pagination. The list and detail endpoints use explicit /api/products routes; no legacy aliases are registered.

Chat accepts a messages array of user/assistant UI messages with id and text/reasoning parts. The final user message must contain metadata.productId. The server loads product facts by ID, retains the o4-mini model, validates input, limits request size, aborts generation on disconnect and returns safe streaming error messages. It does not accept client-supplied system prompts. Contact has no server implementation in the project and remains unchanged.

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

## Parameterized catalog

GET /api/products/catalog accepts text, repeated category, price, sort, page and pageSize. Returns { items, total, page, pageSize, min_price, max_price }. It filters/sorts/pages the MongoDB storefront; existing unfiltered list and detail endpoints are preserved. Invalid values use defaults (sort=price-lowest, page=1, pageSize=6; maximum pageSize=100). Bounds describe the unfiltered result. See the [client catalog URL rules](../client/README.md#catalog-url).

## Recovery

For an application regression, restore a verified MongoDB deployment on Vercel, then check `/api/products`, `/api/products/catalog`, product details, images and chat. Confirm that the restored deployment has the intended environment and access settings.

For damaged data, preserve the current database and logs before restoring from a suitable backup.
