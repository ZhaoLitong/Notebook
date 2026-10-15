# Notebook MVP

This repository currently contains a browser-local TypeScript MVP scaffold for the Notebook product. It supports notebooks, pages, timestamped fragments, meeting page metadata, text/Markdown document upload/edit/export, local search, JSON export, local deletion, and browser dictation where supported. The client is framework-free and split into an application coordinator (`app.ts`), domain helpers (`src/domain.ts`), IndexedDB persistence (`src/persistence.ts`), and HTML views (`src/views.ts`).

## Run locally

Requires Node.js 22.6 or newer for native TypeScript type stripping. The build emits browser JavaScript from the type-annotated source into `dist/`.

```sh
npm run dev
```

Open `http://localhost:3000`. Data is stored in the browser's IndexedDB and stays on that browser profile. Run `npm run check` for TypeScript syntax checks.

## Current boundary

The outbox records local operations and displays pending/offline state, but this initial scaffold has no server synchronization endpoint, PostgreSQL schema, account authentication, or cross-device sync. The current app is therefore suitable for local workflow prototyping, not deployment with user data. Before hosted use, add a managed authentication provider, PostgreSQL migrations/API with workspace ownership checks, HTTPS deployment, server-side idempotency and conflict handling, and backups.

Browser speech recognition is optional and browser-dependent. It creates an editable capture draft and does not upload or retain audio. No external transcription, AI processing, or audio retention is configured.

## Next implementation steps

1. Establish a Next.js/TypeScript app and typed shared domain contracts.
2. Replace the single IndexedDB state record with Dexie entity tables and versioned migrations.
3. Add authenticated PostgreSQL API, operation idempotency, sync acknowledgements, and conflict review.
4. Add tags, document Markdown preview, richer export formats, and deletion audit behavior.
5. Add browser/API tests and verify offline/reconnect workflows on desktop and mobile browsers.
