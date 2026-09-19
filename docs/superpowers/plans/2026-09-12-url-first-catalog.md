# URL-first catalog implementation

Scope: applied catalog criteria, temporary search input, independent view preference, and the API/query contract they use.

1. Parse and serialize typed criteria, preserving unrelated URL keys and omitting defaults; cover history/reset/invalid values.
2. Add useProductFilters using standard React Router navigation. Keep search drafts local with cancellation on navigation. Move grid/list responsibility to catalogViewSlice before removing filterSlice and legacy URL/Redux bridge.
3. Add GET /api/products/catalog for filter/sort/page/pageSize, preserving existing list/detail endpoints and Airtable limit. Return paged items, total and price bounds. Use exact request params in catalog Query keys; retain full-list Query for slider/categories.
4. Update catalogue consumers, tests and audit documentation. Check client/server typecheck, lint, tests, builds and real requests.
