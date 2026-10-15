# Notebook Product Specification

## 1. Product summary

Notebook is a personal information hub for everyday notes, ideas, reference material, editable text/Markdown files, and meeting minutes. It captures text and dictated notes, opens and edits local or uploaded text-based documents, saves changes automatically, and makes content easy to find and review later. Meeting minutes are a focused template and workflow within the broader notebook.

The application does **not** host, join, record, or transcribe the meeting itself. Voice input means dictating the user's own note into the notebook.

## 2. Goals

- Capture a thought, idea, reminder, or observation in seconds with minimal interruption.
- Make every saved note durable, searchable, and available on desktop and mobile.
- Preserve the user's original wording while offering optional organization.
- Provide a focused editor and viewer for text and Markdown files without requiring notebook metadata.
- Work during temporary loss of connectivity.
- Establish a trustworthy foundation for later summaries and knowledge-base enrichment.

## 3. Non-goals for the MVP

- Hosting or joining meetings.
- Recording other participants or capturing system audio.
- Automatic full-meeting transcription.
- Real-time collaboration.
- Automatic sending of tasks or messages to external systems.
- AI-generated content that silently changes the original note.
- Full Office-document editing or a general-purpose word processor.

## 4. Target users and context

The primary user is an individual who wants one dependable place for quick notes and longer-form personal knowledge. They may use a laptop, tablet, or phone and may switch between free-form writing and short fragmented entries. A secondary user context is capturing shorthand while attending an external meeting.

## 5. Core concepts

- **Notebook:** A user-named collection of pages, usually organized by topic, project, or area of life.
- **Note page:** A flexible writing space containing free-form content or timestamped fragments. A page can optionally use a template such as meeting minutes.
- **Meeting minutes:** A note page with optional meeting metadata and conventions for decisions, actions, questions, and participants. It is not a meeting object and has no call integration.
- **Text document:** A plain-text or Markdown file that can be viewed and edited without tags, classifications, or a notebook assignment. Minimal system metadata such as filename and modified time is still retained.
- **Note fragment:** One independently saved text entry, optionally classified as a note, action, decision, or question.
- **Workspace:** The user's account boundary. The MVP may expose one default workspace while keeping the data model extensible.

## 6. MVP workflows

### 6.1 Create and capture a note page

1. The user opens the app and chooses **New page**, **Quick note**, or an existing notebook.
2. The app focuses the capture field immediately.
3. The user types a fragment and submits it with Enter or an explicit save action.
4. The fragment appears in chronological order and is saved automatically.
5. The user can continue entering fragments without leaving the page.

Each fragment receives a creation timestamp. A page may optionally have a title, template, project, and tags.

### 6.2 Use the meeting-minutes template

The user can create a page from the meeting-minutes template. The template adds optional fields for meeting title, date, participants, and agenda, plus convenient classifications for actions, decisions, and questions. The user can still write ordinary notes on the page.

### 6.3 Dictate a fragment

1. The user taps or clicks the microphone control.
2. The app requests microphone permission when needed.
3. The user dictates one short note.
4. The resulting text appears for review before it is committed.
5. The user edits, saves, or discards the draft.

The MVP does not retain audio after transcription unless an explicit retention option is later added.

### 6.4 Organize

The user can classify a fragment as `note`, `action`, `decision`, or `question`, and can edit the classification later. Classification must never alter the original text.

### 6.5 Review and search

The user can browse notebooks and pages by most recent activity, open a page, edit content, and search all owned content. Search must match titles, page text, tags, and project names. Search results show enough context to identify the source page and timestamp.

### 6.6 Export and deletion

The user can export a page or notebook as Markdown or plain text. The user can delete a fragment, page, notebook, or all account data. Destructive actions require confirmation and deleted data must not remain visible in normal search.

### 6.7 View and edit text documents

1. The user opens a `.txt` or `.md` file from the document hub or uploads one.
2. The app displays Markdown with a preview/edit mode and plain text in an editor.
3. The user edits the content and saves it back to the same document.
4. The document remains usable without tags, project assignment, classifications, or a notebook.
5. The user may optionally move the document into a notebook, add tags, or convert it into a richer page.

## 7. Functional requirements

### Capture and editing

- FR-1: A new page or quick note can be created in one primary action.
- FR-2: Text fragments autosave without requiring a separate publish step.
- FR-3: The app shows save/sync state for unsynchronized changes.
- FR-4: A fragment can be edited and deleted.
- FR-5: Draft text survives accidental navigation or reload when possible.
- FR-6: The interface supports keyboard input on desktop and touch input on mobile.
- FR-7: Dictated text is reviewable before saving.

### Organization

- FR-8: Pages have an optional title, template, and notebook/project assignment.
- FR-9: Fragments support the four MVP classifications.
- FR-10: Pages support user-defined tags.
- FR-11: Text and Markdown documents can be viewed and edited without notebook metadata.
- FR-12: A text document can optionally be assigned to a notebook, tagged, or converted into a page.

### Retrieval

- FR-13: Full-text search covers all user-owned pages, fragments, and text documents.
- FR-14: Results identify the matching page/document and relevant location.
- FR-15: A page can be filtered by fragment classification.

### Portability and account

- FR-16: A user can export their data in a documented portable format.
- FR-17: A user can delete their data.
- FR-18: The same account can access data on desktop and mobile.

## 8. Quality requirements

- QR-1: Existing page content is usable within two seconds on a normal connection.
- QR-2: A typed fragment is rendered immediately and does not wait for a network round trip.
- QR-3: Capture remains usable offline; pending changes synchronize when connectivity returns.
- QR-4: Layout is usable at phone widths from 320 CSS pixels through large desktop screens.
- QR-5: Keyboard navigation, visible focus, labels, and screen-reader semantics are supported for core actions.
- QR-6: The original user text is retained exactly unless the user explicitly edits it.
- QR-7: Errors are recoverable and do not discard already saved local content.

## 9. MVP acceptance criteria

The MVP is acceptable when a test user can create a notebook and general note page, enter five fragments, reload the app, find them through search, classify one as an action, create a meeting-minutes page, dictate and correct one fragment, open and edit a Markdown file without adding metadata, export a page, and complete the same workflow with the network disabled and later restored. The test must work on one desktop browser and one iOS or Android mobile browser.

## 10. Deferred roadmap

1. Confirmed AI extraction of summaries, actions, decisions, and open questions.
2. Semantic search across pages.
3. Calendar and task-manager links.
4. Knowledge-base retrieval with citations and source permissions.
5. Mobile widgets, share-sheet capture, and desktop global shortcut.
6. Optional retained audio and full transcription, subject to consent and privacy requirements.
7. Collaboration and shared workspaces.
