# React frontend

Standalone React 18 + TypeScript + Vite + React Router app. No dependency on the root application package or server implementation.

Clerk account controls are provided by `shared/auth/AuthProvider.tsx` and `AccountControls.tsx`. Set `VITE_CLERK_PUBLISHABLE_KEY` to enable them; see [Clerk setup](../docs/clerk-setup.md). `useAccess` exposes loading/guest/authenticated/unavailable states and UI admin access; only the backend authorizes operations. Private HTTP requests use `fetchAuthenticatedJson` with Clerk's current `getToken` callback.

Signed-in users can use Add Product above the catalog (including mobile/empty results)
and on `/my-products`. Edit Product / Delete Product are available for their own
listings and, for Admins, any product. Create/Edit reuse one
React Hook Form + Zod modal; deletion requires confirmation. Images are existing
HTTPS URLs, one per line. PATCH submits changed fields only, preserving untouched
imported values; only new or changed fields use current validation limits.
Errors retain the draft, saving disables repeat submission,
and account changes close the editor. Successful writes refresh catalog queries;
creation preserves filters and provides a product link. A server-clamped page
replaces the URL page without adding history. See [product CRUD](../docs/products-crud.md).

`GET /api/me/products` supplies the personal list and ownership checks on detail pages.
Private queries use `['my-products', userId]`; shell-level cleanup cancels and removes
previous-account queries even after leaving the page. Pending, unavailable and failed
authorization never grant ownership. Personal deletion stays on the page and restores
keyboard focus to the list. Late writes refresh public data and only invalidate the
originating personal key; removed private queries are never recreated by a mutation.

Admins have a Products navigation disclosure linking to My products and the
`/admin/products` moderation panel. Its private list exposes owner ID and creation
date, with search by name/product ID/owner. Existing dialogs handle editing and
confirmed deletion of any publication, including original catalog entries.
`['admin-products', userId]` is cleared on logout, account switch or loss of the
admin claim; ordinary users never load the list. Telegram notification status
and guarded retries are available in the same panel.

Product mutations update the current cart snapshot without changing quantity;
deletion removes the item and refreshes account favorites. Guest favorites keep
an unavailable row until removed. The cart now refreshes complete product
snapshots on mount/focus/reconnect, removes confirmed missing products, and keeps
snapshots during temporary failures. Checkout rereads the product API and
requires review after changes before confirming its demonstration-only submission.
See [integration and verification](../docs/storefront-verification.md).
Live management requires a configured Clerk session; management of other users'
products requires the admin role. Automated UI tests replace the external auth/API
boundaries; they do not provision Clerk accounts or mutate the live catalog.

MongoDB through the product API is the only catalog source. Demo Mode has been
removed; stale demo storage is ignored without clearing the normal cart or favorites.
See [removal notes](../docs/demo-mode.md).

From client/: npm ci, npm run dev. The API must be available on port 3001, or set VITE_API_URL in a local env file to its public origin. All VITE_* values are public. Production hosting needs index.html fallback for frontend routes and /api forwarding (or a configured separate API origin with CORS).

Routes: /, /product/:id, /my-products, /admin/products, /favorites, /checkout, *. Shared providers and Navbar/Footer/Sidebar/CartDrawer wrap Outlet. A native Image component in shared/ui handles loading/fill layout; no image optimizer or generated srcset is supplied. PageTitle sets document titles. Typography uses system fonts.

URL owns applied filters/sort/page; local state owns search drafts; TanStack Query owns API data and favorite ID caches; Redux owns cart and catalog view preference. Cart, guest favorites and grid/list persist safely to localStorage. Authenticated favorites are stored only in MongoDB. See [Catalog URL](#catalog-url).

Favorites use `components/favorites/useFavorites.ts`. Guest favorites persist ordered unique IDs in `volt_favorites` (`{ version: 1, ids, pendingImports }`; older entries without pendingImports still load). The wishlist resolves current product details, including products outside the catalog. Keyboard ordering saves immediately; pointer/touch drag saves on release. Guest storage events update other tabs; Web Locks serialize guest edits against the latest stored IDs and protect pending imports. Invalid storage falls back safely, and blocked/full storage keeps guest edits in memory with a notice.

Authenticated favorites use `/api/me/favorites` and user-scoped Query caches. Guest IDs move into an account-bound pending import before the first request; retry uses the same batch ID. Server snapshots and tokens never enter storage. Logout/account changes remove private caches and ignore late responses. Account lists refresh on focus/reconnect. Reorder uses the server revision and reports 409 conflicts rather than overwriting concurrent changes. See [stage-3 setup and API](../docs/favorites-setup.md).

Commands: npm run typecheck, npm run lint, npm run lint:styles, npm test, npm run build, npm run preview. npm run test:e2e runs Cypress against a running Vite server. Jest uses SWC and jsdom; Cypress has no component-test framework dependency.

The /api/products/catalog request and query key use identical normalized criteria. The unfiltered list remains a separate Query for carousel/categories. The product assistant uses /api/chat UI-message streaming.

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

The Admin panel also shows Telegram status for new publications, with a guarded
`Retry notification` action. Legacy products show `Telegram: not requested`;
historical jobs without a Telegram channel are read-only.
`sent` means Telegram acceptance. Actual sending and scheduled retries require
[server-side configuration](../docs/product-notifications.md).

The [final verification report](../docs/implementation/user-products-stage-6.md)
covers account changes, public publications, moderation and cart/favorites
regressions. Cypress auth boundaries live only in intercepted test pages.

`pages` composes route screens. `components/home` contains `CatalogSection`, `ProductResults` and the mobile controls container, with `filters`, `hooks`, `list` and `slider` grouping their related code. Catalog filter types, utilities and loading skeletons stay with their consumers. Component styles stay beside their components.

Chat and favorites keep their local hooks in their own component folders. `shared` retains the product API and schema, product queries, the catalog URL contract, reusable UI and general helpers. Tests remain in `src/__tests__`.
