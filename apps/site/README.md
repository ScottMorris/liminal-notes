# Liminal Notes Site

Static site placeholder for the Liminal Notes marketing page. Drop your HTML, CSS, and JS in `apps/site/public` and preview locally with a lightweight static server. Shared branding assets are pulled from `assets/branding` via `pnpm site:prepare`, and the generated copies in `public/` are git-ignored to avoid drift.

## Running locally

- Prepare shared assets with `pnpm site:prepare` (copies `assets/branding/*` into `apps/site/public`).
- Serve the files with `pnpm dlx serve apps/site/public` (installs the server on the fly).
- Point your browser to the printed URL (defaults to `http://localhost:3000`).
- Update assets in `public/` as you iterate; the server will reflect changes on refresh.

Notes:

- Keep everything under `public/` so it can be deployed by any static host.
- Use Canadian English in copy where natural.
