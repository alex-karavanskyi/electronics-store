# Final migration report

## 1. Changes

The unused legacy root application was removed only after auditing client/server imports. The root package now orchestrates independent client and server packages, with separate lockfiles. Removed 1,694 root packages during pruning; the final root has no runtime dependencies. Removed accidental file:.. dependencies in both applications. Browser verification also found and fixed mobile hero content overflow by constraining grid tracks and allowing summary text to wrap.

## 2. Replacements

Next App Router -> React Router routes, Links, hooks and Outlet layout. Next build/dev -> Vite. API route handlers -> Express routes and services. Server-only environment -> server/.env/process.env. Browser environment -> VITE_API_URL. next/image -> shared/ui/Image wrapping native img; next/font -> system fonts. Metadata -> index.html and PageTitle/document.title. next/jest -> independent Jest/SWC setup. No SSR, SSG or ISR renderer remains.

## 3. Removed Next parts

Root src/ (App Router pages, layouts, route handlers and duplicate components/tests), next.config.mjs, next-env.d.ts, .next, .swc, root TS build info/config, root Next/Jest/ESLint configuration, Next-specific Cypress component configuration and the hydration-error suppression. Removed use-client directives from the frontend, unused ClientOnly, dead metadata export, old image compatibility directory, unused asset barrel/Next logo, and obsolete root public/coverage. Deleted Next package, eslint-config-next, their lockfile entries and unused dependencies.

## 4. Remaining mentions

No active Next runtime/build dependency, import or route convention remains. ESLint rules intentionally forbid next imports to prevent regression. Historical migration plans and audit documents mention the former application for context. Chat metadata is AI SDK message metadata, and server middleware/next callbacks are Express concepts. Existing ignored root env files are preserved to avoid deleting unrelated local credentials; neither application loads them. Active secrets live only in server/.env.

## 5. Frontend structure

~~~text
client/
  src/
    main.tsx, App.tsx
    app/                 shared Outlet layout, scroll handling, global styles
    pages/               home, product, favorites, contact, not-found
    components/, layout/ UI, forms, cart, chat and SCSS modules
    redux/               cart, favorite, modal, catalogView; persistence middleware
    shared/
      api/               fetch and typed API errors
      filters/           URL parser and serializer
      hooks/             URL actions, queries, responsive state
      lib/               providers and safe storage
      ui/                native Image and reusable controls
    __tests__/            Jest/Testing Library coverage
  public/                favicon
  cypress/               browser regression scenarios
  scripts/               headless Cypress launcher
~~~

## 6. Backend structure

~~~text
server/
  src/
    index.ts              env, startup and shutdown
    app.ts                Express composition/CORS/JSON handling
    config/env.ts         runtime environment validation
    routes/               products and streaming chat
    services/             Airtable products and catalog derivation
    middleware/errors.ts  safe JSON errors
  tests/                  HTTP contracts and AI stream protocol
~~~

No frontend import references backend implementation; backend has no Next dependency. npm run check:architecture guards these boundaries and package/lockfile constraints.

## 7. Frontend routes

| Path | Behavior |
| --- | --- |
| / | Catalog, filters, sorting and pagination |
| /product/:id | Dynamic product detail |
| /favorites | Shared favorite selection |
| /contact | Validated contact form |
| * | 404 UI, then existing delayed replace-navigation home |

Cart is a shared drawer, not a separate route. Static hosting must provide index.html fallback for frontend history URLs and forward /api to Express or configure a separate API origin.

## 8. REST endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | /api/health | Process liveness |
| GET | /api/products | Unfiltered bounded catalog for carousel/categories |
| GET | /api/products/catalog | text/category/price/sort/page/pageSize -> items,total,page,pageSize,min_price,max_price |
| GET | /api/products/:id | Product detail |
| POST | /api/chat | Product-aware AI SDK UI-message SSE |

CORS handles OPTIONS and rejects unconfigured origins; unknown endpoints return JSON 404. All external API credentials remain server-side.

## 9. State ownership

| State | Source |
| --- | --- |
| Applied text/category/price filters, sorting, page | URL -> validated typed criteria |
| Products, details, catalog requests/cache/loading/errors | TanStack Query |
| Search draft before 500ms commit, form values, local filter sidebar | Component state / React Hook Form |
| Cart, favorites, global mobile navigation, grid/list view | Redux |
| Cart and remembered grid/list preference | localStorage persistence only |

No remembered applied-filter restoration or URL/localStorage synchronization is added. Shared URLs always win. Cart hydration validates version and every item with Zod, handles invalid/old data and unavailable storage, and runs once per store.

Both required chains are covered: filter action -> URL -> parseFilters -> query key -> fetch API -> UI; direct filtered URL -> parseFilters -> matching request -> matching UI. Query keys include only request criteria, not unrelated parameters. Query cancellation and cache sharing/revisits are covered by Jest tests.

## 10. Preserved Redux slices

cart: user items, quantities and shared drawer. favorite: session selection/order. modal: Navbar/Sidebar visibility. catalogView: independent grid/list preference. Existing cart middleware retained.

## 11. Removed Redux slices

pagination was fully replaced by URL page. filterSlice was removed after URL criteria and component drafts were separated; only its independent view responsibility was retained in catalogViewSlice.

## 12. Added or made explicit dependencies across migration

react-router-dom, @swc/core, @swc/jest, @testing-library/dom, @types/react, @typescript-eslint/eslint-plugin, @vitejs/plugin-react, eslint-plugin-react-hooks, identity-obj-proxy, vite, cors, dotenv, express, @types/cors, @types/express, tsx.

concurrently was introduced for root development orchestration and patched to 9.2.4 during final cleanup. Runtime React/Redux/TanStack Query/form/AI libraries were preserved, not introduced again. Cypress was relocated from root to client; server received its own ESLint tooling. No application depends on the root package.

## 13. Removed unused/Next dependencies

@emailjs/browser, @fortawesome/fontawesome-free, @gsap/react, @react-three/drei, @react-three/fiber, airtable, autoprefixer, axios, braces, emailjs, flubber, gsap, maath, math-random, next, react-responsive, react-scroll, react-spring, react-swipeable, react-tilt, react-vertical-timeline-component, sharp, @types/flubber, @types/react-scroll, @types/react-vertical-timeline-component, @types/video-react, eslint-config-next, eslint-config-prettier, eslint-plugin-import, eslint-plugin-prettier.

Full before/after inventories: migration-dependencies.json and final-dependency-changes.json. Moving a required library from root to an application is not counted as deleting it from the system.

## 14-16. Commands

~~~sh
npm ci
npm run install:apps
npm run dev
npm run dev:client
npm run dev:server
npm run build
npm start
npm run preview
npm run check:architecture
npm run typecheck
npm run lint
npm run lint:styles
npm test
npm run test:e2e
~~~

Build outputs are client/dist and server/dist. start runs the compiled backend; preview is a local frontend build check. E2E requires the dev server running in another terminal. The launcher removes ELECTRON_RUN_AS_NODE from the child environment because IDEs can set it for their own process. Application packages install independently; run npm install from inside the appropriate package when changing its dependencies.

## Verification evidence

- Client/server TypeScript, ESLint, client SCSS lint and both builds passed.
- 66 client Jest tests and 17 server tests passed.
- 9 Cypress browser scenarios passed: direct filters/refresh, URL and request parameters, reset/unrelated keys, sorting/page history, invalid values/empty results, dynamic detail/native images/cart persistence, API error retry, forms, favorites/404 and mobile layout.
- Real Airtable catalog: 200, 28 records total, requested page 2 returned 6 items; detail and Vite proxy requests returned 200. CORS denied-origin response 403 and allowed preflight 204.
- Desktop and 390px mobile screenshots inspected. Mobile hero overflow corrected and regression assertion added. No browser JavaScript errors observed.
- Production frontend bundle checked against configured secret values: none found; values were not printed.
- AI stream protocol and provider failure tested using mock providers; no paid OpenAI request made.

## 17. TODOs and risks

- npm audit still reports a critical Swiper 11.1.1 advisory and high Cypress 15.4.0/transitive advisories. These versions were already present. Upgrade and regression-test separately before release; Swiper's suggested fix changes major version. Server has four low advisories. Root audit is clean after the compatible concurrently patch.
- Initial frontend JS bundle is about 685 kB (216 kB gzip), above Vite's 500 kB advisory. Route/chat splitting remains future work.
- Airtable service intentionally keeps the existing Grid view/maxRecords=28 limit; catalog filtering is over that set.
- Contact validates, alerts and resets; it does not deliver messages. Account/footer links and checkout are existing incomplete product features.
- No SSR/SSG/ISR, server-generated per-product metadata, image optimization/srcset or bundled web fonts. Native images and system fonts are intentional current replacements.
- Production requires SPA fallback, API routing, exact CORS origins and environment configuration. CORS is not authentication; the existing AI endpoint has no new authentication/rate-limiting layer.
