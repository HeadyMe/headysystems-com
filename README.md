# HeadySystems

> Enterprise AI platform — intelligent infrastructure for modern organizations

**Status:** Active — Production  
**Domain:** [headysystems.com](https://headysystems.com)  
**Last Updated:** March 17, 2026

## Overview

HeadySystems is the landing page and web presence for the HeadySystems vertical of the Heady ecosystem. It serves as the primary entry point for users visiting headysystems.com.

## Heady Ecosystem Integration

This site is part of the Heady platform, an interconnected AI ecosystem:

- **HeadySystems** (headysystems.com) — Enterprise platform core
- **HeadyMe** (headyme.com) — Personal AI dashboard
- **HeadyIO** (headyio.com) — API and developer tools
- **HeadyMCP** (headymcp.com) — MCP protocol management
- **HeadyBuddy** (headybuddy.org) — AI companion
- **HeadyConnection** (headyconnection.org) — Connector marketplace
- **HeadyDocs** (docs.headysystems.com) — Documentation hub

## Setup

```bash
git clone https://github.com/HeadyMe/headysystems-com.git
cd headysystems-com
npm install
npm start
```

Production server runs on port 3000 by default (configurable via `PORT` env var).

## Architecture

- `server.js` — Express production server with static file serving
- `dist/` — Pre-built production assets
- `Dockerfile` — Container deployment configuration
- `src/` — Source files (Vite + React)

## Deployment

Deployed automatically via the Heady Latent OS projection pipeline to Google Cloud Run.

---

(c) 2026 Heady Systems. Part of the Heady Ecosystem.
