# Persistence and Redux cleanup

Scope: client persistence and state ownership only. Preserve cart middleware, backend and legacy Next code.

1. Add regression tests for corrupt/old cart data, unavailable storage, repeated hydration, URL priority and pagination history.
2. Validate versioned cart snapshots with Zod; safely fall back without repeated hydration. Retain existing action-based persistence middleware.
3. Validate grid/list preference and catch storage failures. Restore once at startup; remove cross-tab feedback and navigation-time deletion. Do not restore applied filters from storage.
4. Read applied catalog filters/sort through validated URL parsing. Retain currently consumed filter UI drafts. Move pagination to URL, deleting the redundant slice and persistence middleware. Preserve unrelated URL parameters.
5. Document every slice's responsibility, alternatives and server-state boundary. Run client typecheck, lint, tests and build.
