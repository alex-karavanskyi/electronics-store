# React frontend

Standalone React 18 + TypeScript + Vite + React Router app. No dependency on the root application package or server implementation.

From client/: npm ci, npm run dev. The API must be available on port 3001, or set VITE_API_URL in a local env file to its public origin. All VITE_* values are public. Production hosting needs index.html fallback for frontend routes and /api forwarding (or a configured separate API origin with CORS).

Routes: /, /product/:id, /favorites, /contact, *. Shared providers and Navbar/Footer/Sidebar/CartDrawer wrap Outlet. A native Image component in shared/ui handles loading/fill layout; no image optimizer or generated srcset is supplied. PageTitle sets document titles. Typography uses system fonts.

URL owns applied filters/sort/page; local state owns search drafts; TanStack Query owns API data; Redux owns cart, favorites, mobile navigation and catalog view preference. Cart and grid/list persist safely to localStorage. See [URL-first catalog](docs/url-first-catalog.md) and [the final migration report](../docs/final-migration-report.md).

Commands: npm run typecheck, npm run lint, npm run lint:styles, npm test, npm run build, npm run preview. npm run test:e2e runs Cypress against a running Vite server. Jest uses SWC and jsdom; Cypress has no component-test framework dependency.

The /api/products/catalog request and query key use identical normalized criteria. The unfiltered list remains a separate Query for carousel/categories. Contacts currently validate, alert and reset; no message-delivery endpoint exists. The product assistant uses /api/chat UI-message streaming.
