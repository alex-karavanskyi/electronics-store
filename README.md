# VOLT storefront

React + TypeScript + Vite frontend in [client/](client/README.md), Express + TypeScript REST API in [server/](server/README.md). Each application has its own package and lockfile; the root only orchestrates commands. Node.js 22.12+ is required.

## Setup and development

~~~sh
npm ci
npm run install:apps
~~~

Create server/.env from server/.env.example and fill in Airtable credentials; OPENAI_API_KEY enables chat. Existing local credentials are already present in this workspace's ignored server/.env. Root .env files are not loaded by either application. Never expose secrets as VITE_*.

~~~sh
npm run dev
~~~

Client: http://localhost:5173. API: http://127.0.0.1:3001. Separate commands: npm run dev:client and npm run dev:server.

Client VITE_API_URL is an optional public backend origin without /api. Empty means same-origin /api; Vite development and preview proxy to port 3001. For separate hosting, set it before building and configure CORS_ORIGINS on the backend.

## Build and run

~~~sh
npm run build
npm start
~~~

Build outputs: client/dist and server/dist. npm start starts the compiled API. Serve client/dist with a static host that falls back to index.html for frontend routes, while /api is routed to Express. npm run preview is a local build check, not a production server.

## Verification

~~~sh
npm run check:architecture
npm run typecheck
npm run lint
npm run lint:styles
npm test
npm run test:e2e
~~~

For E2E, start npm run dev in another terminal first. Cypress uses controlled product responses for repeatable UI scenarios; server tests exercise real local HTTP endpoints with mocked external providers. Real Airtable requests are checked separately. The E2E launcher strips an IDE-specific Electron flag only from the test process.

See [the final migration report](docs/final-migration-report.md) for structure, routes, state ownership, removed dependencies, validation evidence and remaining limitations. Historical plans under docs/superpowers record prior migration stages; they are not current setup instructions.
