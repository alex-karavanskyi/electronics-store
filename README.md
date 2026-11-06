# VOLT storefront

React + TypeScript + Vite frontend in [client/](client/README.md), Express + TypeScript REST API in [server/](server/README.md). Each application has its own package and lockfile; the root only orchestrates commands. Use Node.js 26.13.0 LTS and npm 12.2.2, as recorded in `.nvmrc`, `.node-version` and the package manifests. Select this toolchain per project; a global Node.js upgrade is not required.

## Setup and development

```sh
npm ci
npm run install:apps
```

Create `server/.env` from `server/.env.example` and set `MONGODB_URI`. MongoDB is the only product source. The optional `OPENAI_API_KEY` enables chat. The Node entry point loads `server/.env`; existing process environment values take precedence. It does not load the root `.env`. Vercel supplies the function's environment through project settings. Never expose secrets as `VITE_*`.

```sh
npm run dev
```

Client: http://localhost:5173. API: http://127.0.0.1:3001. Vite serves the frontend and proxies `/api` to Express. Both processes stop when either exits. Separate commands: npm run dev:client and npm run dev:server.

Client `VITE_API_URL`, set in `client/.env` or the build environment, is an optional public backend origin without `/api`. Empty means same-origin /api; Vite development and preview proxy to port 3001. For separate hosting, set it before building and configure CORS_ORIGINS on the backend.

## Build and run with Node

```sh
npm run build
npm start
```

Build outputs: `client/dist` and `server/dist`. `npm start` runs the compiled Express server, which serves both `/api` and the built frontend. Open http://127.0.0.1:3001 with the default settings. Frontend history URLs receive `index.html`; unknown `/api` routes receive a JSON 404. Keep `VITE_API_URL` unset for this setup. A separate static server or reverse proxy is not required for local use.

`npm run preview` serves only the built frontend on http://localhost:4173 and proxies `/api` to the separately running backend. Use it to check a build locally. `npm run build:apps` remains an alias for `npm run build`.

## Run on Vercel

The root `vercel.json` installs dependencies and runs `npm run build`. Vercel serves `client/dist` and sends `/api` requests to `api/index.mjs`, which exports the compiled Express adapter. The adapter does not call `listen()` or serve frontend files. The root `engines.node` selects Node.js 26.x. `packageManager` documents the npm version but does not install it; verify that the build environment uses npm 12.2.2 before deployment.

Configure `MONGODB_URI`, optional `OPENAI_API_KEY`, and any custom frontend origins in `CORS_ORIGINS` in the Vercel project environment. Keep `VITE_API_URL` unset for the current same-origin deployment. The function reads `process.env` and does not load `server/.env`; local env files and verification artifacts are excluded from upload.

See the server guide for [environment variables](server/README.md#environment-variables), [startup structure](server/README.md#structure-and-checks), and the limits of `/api/health`.

## Authentication

Clerk provides sign in, sign up, account management and sign out. See [Clerk setup](docs/clerk-setup.md) for local keys, the admin session claim, API verification and deployment configuration. Without Clerk keys the public catalog remains available; protected session requests fail closed.

## Verification

Account favorites: after configuring Clerk, prepare the MongoDB collection with
`npm --prefix server run setup:favorites`. See [favorites setup](docs/favorites-setup.md)
for the authenticated API, guest merge, account isolation and local integration tests.

The Express API lets signed-in users create products and manage their own;
Admins can manage any product. `GET /api/me/products` lists the caller's products.
Signed-in users can publish products and manage their own listings at `/my-products`.
Owner controls also appear on product pages; Admins can manage any product.
The Admin panel at `/admin/products` lists all publications, with search by
name/product ID/owner, editing and confirmed deletion. It is available through
the Products menu after signing in with the admin claim; see [Admin setup](docs/clerk-setup.md).
See [CRUD contract](docs/products-crud.md) for rights, the explicit
`npm --prefix server run setup:products` index preparation and isolated tests.

New publications support private Telegram notifications with durable retries and
an Admin delivery status/retry action. See [Telegram setup](docs/product-notifications.md)
for bot creation, server settings and scheduler activation. Email delivery has
been removed; actual Telegram delivery still requires configuring and deploying the app.

Demo Mode has been removed; existing browser demo data is ignored.
See [removal and compatibility](docs/demo-mode.md).

[Storefront integration](docs/storefront-verification.md) describes cart
reconciliation, checkout review, account boundaries and the complete
Guest/User/Admin verification checklist.

The [stage 6 verification report](docs/implementation/user-products-stage-6.md)
records current local test results separately from live Clerk, database indexes,
deployment and Telegram scheduler activation.

```sh
npm run check:architecture
npm run typecheck
npm run lint
npm run lint:styles
npm test
npm run test:e2e
```

For E2E, start npm run dev in another terminal first. Cypress uses controlled product responses for repeatable UI scenarios; server tests exercise real local HTTP endpoints with mocked external providers. MongoDB integration tests use an isolated local mongod: set MONGODB_TEST_BINARY and run npm --prefix server run test:mongodb. The E2E launcher strips an IDE-specific Electron flag only from the test process.

## Production

The store is deployed on [Vercel](https://volt-electronics-store.vercel.app), with products in MongoDB Atlas and images in Cloudinary. Root vercel.json builds the frontend and Express API function. Production needs MONGODB_URI, OPENAI_API_KEY for chat and CORS_ORIGINS; VITE_API_URL stays unset for same-origin requests.
