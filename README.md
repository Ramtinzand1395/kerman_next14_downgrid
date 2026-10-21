This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Cloudinary configuration

Image uploads and deletions run only on the server and require these private
environment variables:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Set the same variables in the VPS server-side environment. Never expose the API
secret through a variable whose name starts with `NEXT_PUBLIC_`.

## Gallery synchronization

Wall-art product changes are written to a durable MongoDB outbox and delivered
by the PM2-supervised `kermanatari-gallery-sync` worker. The worker talks only
to the independent gallery HTTPS API; the website never connects to the
gallery database.

Required server-side variables in the VPS `.env` file:

```env
GALLERY_SYNC_URL=https://katalog-beryl.vercel.app/api/sync
GALLERY_SYNC_API_KEY=use-the-same-strong-secret-configured-on-the-gallery
```

The key must not use a `NEXT_PUBLIC_` prefix. Requests have an 8-second timeout,
reject redirects, and retry from the durable outbox with bounded exponential
backoff. The API key and response bodies are not logged.

Preview the initial synchronization without sending requests:

```bash
npm run gallery:sync -- --dry-run
```

After reviewing every reported `upsert`, apply it explicitly:

```bash
npm run gallery:sync -- --apply
```

The command loads and validates the complete source query before sending
anything and uses individual idempotent upserts. It never calls `replace_all`
and never deletes gallery records.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## VPS deployment

This application is deployed on the VPS with PM2 using
`ecosystem.config.cjs`; it is not a Vercel deployment. From the existing VPS
checkout on `main`, use the established PM2 flow:

```bash
git pull --ff-only origin main
npm ci
npm test
npm run lint
npm run build
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
```

Set the server-side environment variables before `startOrReload`. Do not place
secrets in Git or print them in deployment logs. The gallery itself remains an
independent Vercel project and is not changed by this deployment.
