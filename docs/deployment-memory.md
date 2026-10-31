# VPS build memory correction

The production run for `dd504a0` compiled successfully, then aborted in the Next.js type-check worker at approximately 984 MiB heap with `JavaScript heap out of memory`. PM2 restart was never reached. This is a resource failure after compilation, not a successful deployment.

Production deployment now depends on the existing reusable GitHub validation workflow. It runs tests, standalone TypeScript checking and a full ordinary Next.js build, retaining Next.js route/type validation. A failed check blocks SSH deployment. The VPS resets to the exact validated `github.sha`, never a newer unvalidated `origin/main`.

Only that deployment build receives `NEXT_DEPLOY_VALIDATED_SHA`. Next config verifies the SHA matches the checkout, omits the duplicate TypeScript pass, and uses one page-generation worker. Ordinary local and CI builds keep type checking enabled. Linting remains enabled on the VPS. The skip variable is scoped to the build command, not PM2 runtime. No heap limit is raised and no OS memory/swap/CDN settings or database content are changed. Deployment concurrency serializes production releases.

Regression tests cover default checking, correct/mismatched SHA behavior, validation dependencies and exact-commit pinning. Validate the resource-constrained path with `NODE_OPTIONS=--max-old-space-size=1024 NEXT_DEPLOY_VALIDATED_SHA=<current-sha> npm run build` after the ordinary validation succeeds. The workflow also prints available RAM and Node's heap limit for future diagnosis.

Next.js 14 supports running the required type check separately in the build/deploy process: https://nextjs.org/docs/14/app/api-reference/next-config-js/typescript
Memory guidance: https://nextjs.org/docs/app/guides/memory-usage
