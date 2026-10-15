# Notebook Technical Specification

## 1. Recommended delivery strategy

Start with one responsive Progressive Web App (PWA). It runs in desktop and mobile browsers and can be installed from the browser. Keep the client and server interfaces suitable for later Capacitor mobile packaging or a Tauri desktop shell if native shortcuts, widgets, or share actions become important.

## 2. MVP stack and evolution

The current MVP is a framework-free browser application written in TypeScript. `app.ts` coordinates the UI and user actions; focused modules under `src/` own the domain types and selectors, local persistence, and HTML view rendering. TypeScript compiles these ES modules to `dist/`, which the small Node server serves with the static HTML and CSS.

- TypeScript and native browser APIs; no UI framework or runtime dependency.
- IndexedDB stores the current application state as one record. `LocalStateStore` isolates IndexedDB access so it can later be replaced with versioned entity stores without coupling the views to the database.
- The outbox is local bookkeeping only. This MVP does not yet send operations to a server or synchronize between devices.
- Search currently filters the in-memory local state. Server-side search is a later capability.
- The current MVP has no accounts, hosted database, object storage, transcription service, or background jobs.

When product complexity warrants it, the client may move to React/Next.js or another component framework, and local storage may move to Dexie or an equivalent typed wrapper. A hosted phase will add authenticated APIs, PostgreSQL, server-side search, deployment, backups, and secret management. These are evolution choices, not requirements for maintaining the current MVP.

The exact hosting provider remains open for the hosted phase. Deployed services must provide HTTPS, managed PostgreSQL, backups, and environment-secret management.

## 3. Client structure and module boundaries

Keep the MVP in small, dependency-light TypeScript modules with one direction of dependency:

```text
app.ts (startup, event delegation, use cases)
  ├── src/domain.ts (types, initial state, selectors)
  ├── src/persistence.ts (IndexedDB adapter)
  └── src/views.ts (HTML rendering and output escaping)
```

Views receive state and return markup; they do not read storage or attach event handlers. Persistence reads and writes state; it does not know about the DOM. The application coordinator handles browser events and calls domain/persistence operations. Keep styles in `styles.css`, not inline in markup. Prefer a small view helper for each screen or reusable region over a single large template. Use delegated events from the stable app root so replacing rendered content does not require reattaching per-element handlers.

As the app grows, split use cases and screen views into additional modules by feature. Introduce a framework when component state, accessibility needs, or UI complexity makes it beneficial; do not make a framework a prerequisite for MVP feature work.

The main views are:

- Notebook and page list / recent activity.
- Page editor with free-form content and optional chronological fragments.
- Document hub with text/Markdown file list and editor/preview.
- Search results.
- Settings, export, and deletion.

Desktop may show the notebook/page list, editor, and metadata panel together. Mobile should prioritize a single capture view with a large input and microphone control. The capture control must remain reachable without scrolling through long pages.

## 4. Offline-first target behavior

The sequence below describes the intended synchronized product behavior. In the current MVP, local edits are saved to IndexedDB and recorded in an outbox, but steps 5 and 6 are not implemented.

All writes follow this sequence:

1. Validate input locally.
2. Write the change to IndexedDB.
3. Render the change immediately.
4. Add an operation to a local outbox.
5. Send outbox operations when online.
6. Mark the operation synchronized after server acknowledgement.

Every entity has a stable client-generated UUID, `createdAt`, `updatedAt`, and synchronization metadata. The MVP uses per-record conflict handling: if the same record changes on multiple devices, retain the server copy and preserve the local conflicting version for user review. A collaborative CRDT is out of scope.

## 5. Data model

Core tables/entities:

- `users`: account identity and audit timestamps.
- `workspaces`: owner and settings.
- `notebooks`: workspace, name, and timestamps.
- `pages`: notebook, title, template type, optional project, timestamps, archive state.
- `documents`: workspace, optional notebook/page link, filename, MIME type, content or object-storage key, size, checksum, timestamps, and version.
- `fragments`: page, content, classification, timestamps, client ID, sync version, deleted-at marker.
- `tags` and `page_tags`: user-defined labels.
- `outbox_events`: idempotent client operations and processing status.

The original fragment content is the source of truth. AI outputs, when added, belong in separate records with model/version, source fragment IDs, creation time, and user-confirmed status.

## 6. API expectations

The API must support authenticated CRUD operations for notebooks, pages, fragments, text documents, tags, search, export, and account deletion. Write endpoints must be idempotent by client operation ID so retries cannot create duplicate fragments or document versions. Search endpoints should support pagination and a classification filter.

## 7. Voice input

The MVP treats voice as short-form dictation. Prefer the platform/browser speech facility when it is available and use a server transcription endpoint as the consistent fallback. Show transcription as an editable draft before saving. Do not store raw audio by default; if audio retention is added later, require explicit consent, encryption, a retention setting, and a deletion path.

Microphone permission failures, unsupported browsers, silence, and transcription errors must leave the text capture workflow fully usable.

## 8. Security and privacy

- Require HTTPS in all deployed environments.
- Store passwords only through a managed authentication provider or a vetted password-hashing implementation; passkeys are a preferred future option.
- Enforce workspace ownership on every query and mutation.
- Encrypt data in transit and use provider-managed encryption at rest.
- Do not send note content to AI or transcription providers without an explicit product decision and privacy disclosure.
- Provide export and deletion controls.
- Keep audit logs for account-level destructive operations.

## 9. Testing

- Unit tests for fragment validation, classification, serialization, and sync conflict handling.
- API tests for authorization, idempotent writes, search, export, and deletion.
- Browser tests for capture, reload persistence, offline queueing, reconnection, dictation draft handling, and responsive layouts.
- Accessibility checks for keyboard navigation, focus order, labels, and contrast.
- Manual tests on a current Chromium desktop browser and current iOS/Android browser.

## 10. Delivery phases

### Phase 1: Capture foundation

Authentication, notebooks/pages, text/Markdown documents, autosave, mobile/desktop layout, local persistence, and server synchronization.

### Phase 2: Retrieval and portability

Search, tags, classifications, text/Markdown editing, export, deletion, and reliable offline reconciliation.

### Phase 3: Voice

Microphone permissions, dictation draft flow, transcription fallback, and error handling.

### Phase 4: Assistance

User-confirmed summaries and action extraction, semantic search, and knowledge-base retrieval with citations.

## 11. Decisions to revisit before public launch

- Single-user personal tool versus shared workspaces.
- Authentication provider and hosting region.
- Data retention and enterprise compliance requirements.
- Whether AI processing may use third-party services.
- Native packaging requirements and app-store distribution.
