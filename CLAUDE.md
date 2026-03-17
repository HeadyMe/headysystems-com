# CLAUDE.md — HeadySystems

## System Identity
This is the **HeadySystems** domain site (headysystems.com), part of the Heady AI ecosystem.

## Role
Landing page and web presence for the HeadySystems vertical. Serves pre-built static assets via Express in production.

## Critical Paths
- `server.js` — Production Express server
- `dist/` — Built assets (linked as `public/`)
- `Dockerfile` — Container build config
- `serve.json` — Static file serving configuration
- `src/` — Source (Vite + React when developing)

## Integration Points
- Deployed via Heady Latent OS projection pipeline
- Runs on Google Cloud Run
- Part of the unified Heady domain constellation
- Shares design system and branding with other Heady sites

## Development
- `npm start` — Run production server
- `npm run dev` — Run Vite dev server
- `npm run build` — Build production assets
