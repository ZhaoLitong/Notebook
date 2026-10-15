# Notebook Technical Specification

## 1. Recommended delivery strategy

Start with one responsive Progressive Web App (PWA). It runs in desktop and mobile browsers and can be installed from the browser. Keep the client and server interfaces suitable for later Capacitor mobile packaging or a Tauri desktop shell if native shortcuts, widgets, or share actions become important.

## 2. Initial stack

- React, TypeScript, and Next.js.
- IndexedDB accessed through Dexie (or an equivalent typed wrapper) for local notes and an outbox.
- PostgreSQL for durable server data.
- PostgreSQL full-text search for the first search implementation.
- Object storage only if attachments or retained audio are explicitly introduced.
- A background job mechanism for transcription and future AI work.

The exact hosting provider is intentionally open. The deployment must provide HTTPS, managed PostgreSQL, backups, and environment-secret management.

## 3. Client structure

The main views are:

- Notebook and page list / recent activity.
- Page editor with free-form content and optional chronological fragments.
- Document hub with text/Markdown file list and editor/preview.
- Search results.
- Settings, export, and deletion.

Desktop may show the notebook/page list, editor, and metadata panel together. Mobile should prioritize a single capture view with a large input and microphone control. The capture control must remain reachable without scrolling through long pages.

## 4. Offline-first behavior

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
