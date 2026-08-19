# VOLT E-Commerce Storefront

## Overview

VOLT is a responsive technology storefront built with the Next.js App Router. It lets users browse an Airtable-backed product catalogue, refine results, view product details, save favorites, and manage a persistent shopping cart. Product pages also include an AI assistant for product-specific questions.

## Features

- Product catalogue with loading, error, and empty-result states
- Search, category and price filters synchronized with URL parameters
- Sorting, pagination, and switchable grid/list views
- Product detail pages with image galleries and a product-aware AI chat assistant
- Favorites collection with drag-and-drop reordering
- Persistent cart drawer with quantity controls, item removal, clearing, and totals
- Validated contact form and responsive navigation/layout

## Tech Stack

- Next.js 14, React 18, and TypeScript
- Redux Toolkit and React Redux
- styled-components
- React Hook Form, Zod, and `@hookform/resolvers`
- Airtable API and Axios
- Vercel AI SDK with OpenAI
- Jest, React Testing Library, and Cypress

## Getting Started

### Requirements

- Node.js 18.17 or newer
- npm
- An Airtable base containing the product data
- An OpenAI API key to use the product assistant

### Installation

```bash
git clone https://github.com/alex-karavanskyi/electronics-store.git
cd electronics-store
npm ci
```

Create a `.env.local` file in the project root:

```env
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id
AIRTABLE_TABLE_NAME=your_airtable_table_name
OPENAI_API_KEY=your_openai_api_key
```

The Airtable variables provide the catalogue data. `OPENAI_API_KEY` is only needed for the product chat assistant. Keep this file local; environment files are excluded from Git.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run the Jest test suite:

```bash
npm test
```

## Testing

Jest and React Testing Library cover catalogue rendering, product loading states, filter behavior and URL updates, cart and favorites reducers, cart drawer interactions, modal state, navigation links, and contact-form validation. Cypress provides an end-to-end specification for product search, category filtering, and empty results.

To run the Cypress tests, keep the development server running and use a second terminal:

```bash
npx cypress run
```

## Available Scripts

| Script                | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Start the development server                   |
| `npm run build`       | Create a production build                      |
| `npm run start`       | Start the production server after a build      |
| `npm run lint`        | Run ESLint                                     |
| `npm run lint:fix`    | Run ESLint and apply fixable changes           |
| `npm run lint:styles` | Run Stylelint against TypeScript and TSX files |
| `npm test`            | Run the Jest test suite                        |

## Project Structure

```text
src/
├── app/          # App Router pages and API routes
├── components/   # Catalogue, product, cart, favorites, contact, and chat UI
├── layout/       # Shared navigation, sidebar, footer, and status views
├── redux/        # Store, slices, middleware, provider, and typed hooks
├── shared/       # Reusable hooks, UI, utilities, constants, and types
└── __tests__/    # Jest and React Testing Library tests
cypress/e2e/      # Cypress end-to-end tests
```

## Live Demo

[View the live application](https://electronics-store-next.vercel.app)
