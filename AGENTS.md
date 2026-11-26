# QrOne

Free QR code studio and checker, plus editable codes with exportable
redirects. Vite + plain JavaScript front end (`src/`, the `*.html` pages), a
Site Worker (`app/src`) and a Redirect Worker (`worker/src`) on Cloudflare,
D1 database (migrations in `worker/migrations`). See `README.md`,
`PRODUCT.md` and `DESIGN.md`.

## Setup (fresh checkout)

```bash
npm ci
cp .dev.vars.example .dev.vars                     # only for the full stack below
npx wrangler d1 migrations apply qrone --local     # only for the full stack below
```

## Dev server

- Front end only (studio, checker, static pages): `npm run dev -- --port <port> --strictPort`
- Full stack (dashboard, `/api`): `npm run build && npx wrangler dev --port <port>`

## Validation

Matches `factory/checks.sh`:

```bash
npm test        # Node's built-in test runner, tests/*.test.js
npm run build   # vite build into dist/
```

## Software factory

`/factory run` builds every open GitHub issue labeled `factory` through
intake → spec → build → gate → review → approve, one PR per issue. State is in
`factory/jobs/` (gitignored); `factory/bin/job` is its only writer. Checks:
`factory/checks.sh`. Dashboard: `cd factory && python3 -m http.server`, then
open http://localhost:8000/dashboard.html.

Each job works in its own git worktree, a full checkout of the repo at
`.worktrees/<job-id>` (gitignored). A tool run from the repo root that doesn't
read `.gitignore` sees those copies too; exclude `.worktrees/` in its config.
