# Kerman Atari

Persian RTL storefront and admin dashboard built with Next.js 14 App Router,
React 18, TypeScript, Tailwind CSS 3, MongoDB and Mongoose. Production runs on
Node.js 24 with PM2; merges to `main` trigger the validated VPS deployment.

## Local setup

1. Install Node.js 24 and run `npm ci`.
2. Copy `.env.example` to `.env.local` and supply the private values needed by
   the features you are working on. Use an isolated database for development.
3. Start the application with `npm run dev`.

The standalone notification worker and migration commands use `.env`, not
`.env.local`. Keep all real credentials outside Git.

## Validation

| Command | Purpose |
| --- | --- |
| `npm test` | Domain and API regression tests; optional integration suites skip by default |
| `npm run lint` | Next.js and React lint checks |
| `npx tsc --noEmit` | Strict types, unused locals and unused parameters |
| `npm run audit:assets` | Local media inventory, exact duplicates and missing static image paths |
| `npm run build` | Production build with type and lint checks |

Run the isolated MongoDB integration suites with synthetic data:

```bash
PRINT_MONGO_INTEGRATION=true POS_LOCAL_TRANSACTION_TESTS=true MONGOMS_VERSION=7.0.24 \
  node --test print-queue-mongodb.test.mjs pos-sales-transaction.test.mjs
```

These suites start local MongoDB processes and need the MongoDB test binary.
They do not need production database credentials.

## Media maintenance

- Application images live in `public/`; product, game and blog uploads use
  Cloudinary. Upload and deletion credentials are server-only.
- `config/optimized-images.json` records the PNG/JPEG to WebP migration, byte
  sizes and dimensions. `next.config.js` redirects old URLs to their new files.
- `npm run audit:assets` reports unreferenced candidates for review. Constructed
  paths and references stored in MongoDB must also be checked before deletion.
- Put new review screenshots in the ignored `artifacts/qa/` or
  `artifacts/banner-qa/` directories. Tests, migrations, workers and operational
  recovery records are intentional project files.

The full cleanup findings and validation are in
[`docs/project-cleanup-2026-11-09.md`](docs/project-cleanup-2026-11-09.md).
