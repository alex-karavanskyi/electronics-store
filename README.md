# VOLT storefront

React + TypeScript + Vite frontend in [client/](client/README.md), Express + TypeScript REST API in [server/](server/README.md). Each application has its own package and lockfile; the root only orchestrates commands. Use Node.js 22.12 or later within the 22.x release line, as specified by the root package.

## Setup and development

```sh
npm ci
npm run install:apps
```

Create `server/.env` from `server/.env.example` and set `MONGODB_URI`. MongoDB is the only product source; the optional `OPENAI_API_KEY` enables chat. The Node entry point loads `server/.env`; existing process environment values take precedence. It does not load the root `.env`. Vercel supplies the function's environment through project settings. Never expose secrets as `VITE_*`.

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

The root `vercel.json` installs dependencies and runs `npm run build`. Vercel serves `client/dist` and sends `/api` requests to `api/index.mjs`, which exports the compiled Express adapter. The adapter does not call `listen()` or serve frontend files.

Configure `MONGODB_URI`, optional `OPENAI_API_KEY`, and any custom frontend origins in `CORS_ORIGINS` in the Vercel project environment. Keep `VITE_API_URL` unset for the current same-origin deployment. The function reads `process.env` and does not load `server/.env`; local env files and verification artifacts are excluded from upload.

See the server guide for [environment variables](server/README.md#environment-variables), [startup structure](server/README.md#structure-and-checks), and the limits of `/api/health`.

## Verification

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
