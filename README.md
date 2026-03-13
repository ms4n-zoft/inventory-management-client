# Frontend

React operations dashboard for the inventory management system. Built with Vite, TypeScript, Tailwind CSS, and shadcn/ui components.

## Tech stack

- **Framework**: React 19
- **Build tool**: Vite
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix UI)
- **Routing**: React Router v7
- **Testing**: Vitest + Testing Library

## Setup

```bash
cp .env.example .env.local
pnpm install
```

## Commands

```bash
pnpm dev     # start dev server on http://localhost:3000
pnpm build   # type-check and build for production (output: dist/)
pnpm test    # run tests (vitest)
pnpm lint    # type-check only
```

## Environment variables

Copy `.env.example` to `.env.local` and adjust as needed. The only variable is the backend API URL, which defaults to `http://127.0.0.1:4000` if not set.

| Variable       | Default                 | Description                 |
| -------------- | ----------------------- | --------------------------- |
| `VITE_API_URL` | `http://127.0.0.1:4000` | Base URL of the backend API |

## Pages

| Route                   | Description                                |
| ----------------------- | ------------------------------------------ |
| `/`                     | Create billing options and starting stock  |
| `/view`                 | Browse billing options and inventory pools |
| `/view/billing-options` | Search every created billing option        |
| `/view/inventory-pools` | Search every tracked inventory pool        |
| `/audit`                | Audit log                                  |
