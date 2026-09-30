# React frontend

Standalone React 18 + TypeScript + Vite + React Router app. No dependency on the root application package or server implementation.

From client/: npm ci, npm run dev. The API must be available on port 3001, or set VITE_API_URL in a local env file to its public origin. All VITE_* values are public. Production hosting needs index.html fallback for frontend routes and /api forwarding (or a configured separate API origin with CORS).

Routes: /, /product/:id, /favorites, /contact, *. Shared providers and Navbar/Footer/Sidebar/CartDrawer wrap Outlet. A native Image component in shared/ui handles loading/fill layout; no image optimizer or generated srcset is supplied. PageTitle sets document titles. Typography uses system fonts.

URL owns applied filters/sort/page; local state owns search drafts; TanStack Query owns API data; Redux owns cart, favorites, mobile navigation and catalog view preference. Cart and grid/list persist safely to localStorage. See [Catalog URL](#catalog-url).

Commands: npm run typecheck, npm run lint, npm run lint:styles, npm test, npm run build, npm run preview. npm run test:e2e runs Cypress against a running Vite server. Jest uses SWC and jsdom; Cypress has no component-test framework dependency.

The /api/products/catalog request and query key use identical normalized criteria. The unfiltered list remains a separate Query for carousel/categories. Contacts currently validate, alert and reset; no message-delivery endpoint exists. The product assistant uses /api/chat UI-message streaming.

## Catalog URL

The browser URL stores `text`, repeated `category`, `price`, `sort` and `page`. For example: `/?text=phone&category=phones&price=500&sort=price-highest&page=2#collection`.

- `text` defaults to an empty string. Categories are deduplicated and sorted.
- `price` is an optional nonnegative maximum price; zero is valid. Empty or invalid values mean no price limit.
- `sort` accepts `price-lowest`, `price-highest`, `name-a` and `name-z`; the default is `price-lowest`.
- `page` is a positive integer and defaults to 1. Changing filters or sorting resets it to 1.
- Serialization omits default values and preserves unrelated query parameters. Navigation preserves the pathname and hash. Back/forward navigation restores applied criteria and the search draft.

The view preference is stored separately in Redux and localStorage. Grid view requests 6 products per page; list view requests page 1 with up to 100 products and reveals them locally in batches of 7. `pageSize` is an API parameter, not a browser URL setting.

URL parsing and serialization live in [productFilters.ts](src/shared/filters/productFilters.ts); navigation updates live in [useProductFilters.ts](src/components/home/hooks/useProductFilters.ts). See the [catalog API contract](../server/README.md#parameterized-catalog) for response fields and server defaults.

## Source organization

`pages` composes route screens. `components/home` contains `CatalogSection`, `ProductResults` and the mobile controls container, with `filters`, `hooks`, `list` and `slider` grouping their related code. Catalog filter types, utilities and loading skeletons stay with their consumers. Component styles stay beside their components.

Chat and favorites keep their local hooks in their own component folders. `shared` retains the product API and schema, product queries, the catalog URL contract, reusable UI and general helpers. Tests remain in `src/__tests__`.
