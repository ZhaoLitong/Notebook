import { AppState, currentPage, Page, searchResults, View } from './domain.js';

export function escapeHtml(value: string | undefined = ''): string {
  return String(value).replace(/[&<>\'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]!);
}

const viewTitle: Record<View, string> = {
  home: 'Capture and review', notes: 'Notes', docs: 'Documents', search: 'Search', settings: 'Settings',
};

export function renderApp(state: AppState): string {
  const content = state.view === 'home' ? renderHome(state)
    : state.view === 'notes' ? renderNotes(state)
      : state.view === 'docs' ? renderDocuments(state)
      : state.view === 'search' ? renderSearch(state)
        : renderSettings();
  return `<div class="shell">${renderSidebar(state.view)}<main class="main"><header class="topbar"><h1>${viewTitle[state.view]}</h1><input class="search" id="global-search" placeholder="Search notes, tags, files" value="${state.view === 'search' ? escapeHtml(state.query || '') : ''}"></header><section class="content${state.view === 'docs' ? ' documents-content' : ''}">${content}</section></main></div>`;
}

function renderSidebar(view: View): string {
  const navigation = [
    ['home', 'Recent pages'], ['notes', 'All notes'], ['docs', 'Text documents'], ['search', 'Search'], ['settings', 'Settings'],
  ] as const;
  return `<aside class="sidebar"><div class="brand">Notebook</div><nav class="nav">${navigation.map(([key, title]) => `<button data-view="${key}" class="${view === key ? 'active' : ''}">${title}</button>`).join('')}</nav><div class="status" id="sync-status"></div></aside>`;
}

function renderHome(state: AppState): string {
  const page = currentPage(state);
  return `<div class="toolbar"><div><h2>${page ? escapeHtml(page.title) : 'Your notebook'}</h2><div class="muted">${page ? 'Capture fragments as you think.' : 'Start with a page or a quick note.'}</div></div><div class="actions"><button class="secondary" id="new-notebook">+ Notebook</button><button class="primary" id="new-page">+ New page</button><button class="secondary" id="quick-note">Quick note</button><button class="secondary" id="meeting">Meeting minutes</button></div></div><div class="layout"><div class="panel">${page ? renderEditor(state, page) : '<div class="empty">No pages yet. Create one to begin.</div>'}</div><aside class="panel"><h2>Pages</h2><div class="page-list">${state.pages.map((item) => `<button class="page-item ${item.id === state.selectedPage ? 'selected' : ''}" data-page="${item.id}"><strong>${escapeHtml(item.title || 'Untitled page')}</strong><span class="muted">${new Date(item.updatedAt).toLocaleDateString()}</span></button>`).join('') || '<div class="muted">No pages</div>'}</div></aside></div>`;
}

function renderEditor(state: AppState, page: Page): string {
  const fragments = state.fragments.filter((fragment) => fragment.pageId === page.id && !fragment.deletedAt);
  const meetingFields = page.template === 'meeting' ? `<div class="field"><label for="participants">PARTICIPANTS</label><input id="participants" value="${escapeHtml(page.meeting?.participants || '')}" placeholder="Names, separated by commas"></div><div class="field"><label for="agenda">AGENDA</label><textarea id="agenda">${escapeHtml(page.meeting?.agenda || '')}</textarea></div>` : '';
  return `<div class="field"><label for="page-title">PAGE TITLE</label><input id="page-title" value="${escapeHtml(page.title)}"></div>${meetingFields}<div class="capture"><textarea id="capture" placeholder="Capture a thought, action, decision, or question...">${escapeHtml(state.drafts?.[page.id] || '')}</textarea><div class="capture-actions"><button class="primary" id="save-fragment">Save fragment</button><button class="secondary icon" id="dictate" title="Dictate">Mic</button></div></div><div class="fragment-list">${fragments.map(renderFragment).join('') || '<div class="empty">Your saved fragments will appear here.</div>'}</div>`;
}

function renderFragment(fragment: AppState['fragments'][number]): string {
  const classifications = ['note', 'action', 'decision', 'question'] as const;
  return `<article class="fragment"><div class="fragment-head"><span>${new Date(fragment.createdAt).toLocaleString()}</span><span><select data-classify="${fragment.id}" aria-label="Classification">${classifications.map((value) => `<option ${fragment.classification === value ? 'selected' : ''}>${value}</option>`).join('')}</select> <button class="danger" data-delete="${fragment.id}">Delete</button></span></div><p>${escapeHtml(fragment.content)}</p></article>`;
}

function renderNotes(state: AppState): string {
  const notes = state.fragments
    .filter((fragment) => !fragment.deletedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pages = [...state.pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const items = pages.map((page) => {
    const pageNotes = notes.filter((note) => note.pageId === page.id);
    const details = [state.drafts[page.id], page.meeting.agenda].filter((value) => value?.trim()).join('\n');
    return `<section class="note-page"><div class="note-meta"><div><strong>${escapeHtml(page.title || 'Untitled page')}</strong><div>${new Date(page.updatedAt).toLocaleString()} &middot; ${pageNotes.length} saved ${pageNotes.length === 1 ? 'note' : 'notes'}</div></div><button class="danger" data-delete-page="${page.id}" aria-label="Delete page ${escapeHtml(page.title || 'Untitled page')}">Delete page</button></div>${details ? `<p>${escapeHtml(details)}</p>` : ''}${pageNotes.map((note) => `<article class="note-item"><div class="note-meta"><span>${escapeHtml(note.classification)} &middot; ${new Date(note.createdAt).toLocaleString()}</span><button class="danger" data-delete="${note.id}" aria-label="Delete note">Delete note</button></div><p>${escapeHtml(note.content)}</p></article>`).join('')}</section>`;
  }).join('');
  return `<div class="toolbar"><h2>All notes</h2><span class="muted">${pages.length} ${pages.length === 1 ? 'page' : 'pages'} &middot; ${notes.length} saved ${notes.length === 1 ? 'note' : 'notes'}</span></div><div class="note-list">${items || '<div class="empty">No pages or notes yet.</div>'}</div>`;
}

function renderDocuments(state: AppState): string {
  const doc = state.documents.find((item) => item.id === state.activeDoc) || state.documents[0];
  const list = state.documents.map((item) => `<button class="doc-item" data-doc="${item.id}"><strong>${escapeHtml(item.filename)}</strong><div class="muted">${new Date(item.updatedAt).toLocaleDateString()}</div></button>`).join('') || '<div class="muted">No documents yet.</div>';
  const editor = doc ? `<div class="field"><label for="doc-name">FILENAME</label><input id="doc-name" value="${escapeHtml(doc.filename)}"></div><textarea class="doc-editor" id="doc-content">${escapeHtml(doc.content)}</textarea><div class="actions document-actions"><button class="primary" id="save-doc">Save document</button><button class="secondary" id="export-doc">Export</button></div>` : '<div class="empty">Choose or create a document.</div>';
  return `<div class="toolbar"><div><h2>Text documents</h2><div class="muted">Edit plain text and Markdown without notebook metadata.</div></div><div class="actions"><label class="primary">Upload<input id="upload" type="file" accept=".txt,.md,text/plain,text/markdown" hidden></label><button class="secondary" id="new-doc">+ New document</button></div></div><div class="doc-grid"><div class="doc-list">${list}</div><div class="panel">${editor}</div></div>`;
}

function renderSearch(state: AppState): string {
  const query = (state.query || '').trim();
  const results = searchResults(state);
  return `<div class="panel"><h2>${query ? `Results for "${escapeHtml(query)}"` : 'Search your notebook'}</h2>${results.map((item) => `<button class="page-item" data-result="${item.id}" data-type="${item.type}"><strong>${escapeHtml(item.title)}</strong><div>${escapeHtml(item.text.slice(0, 180))}</div><span class="muted">${escapeHtml(item.type)}</span></button>`).join('') || '<div class="empty">No matches.</div>'}</div>`;
}

function renderSettings(): string {
  return '<div class="panel"><h2>Settings and data</h2><p class="muted">Local-first storage is active. Changes are queued for synchronization when a server provider is configured.</p><div class="actions"><button class="primary" id="export-all">Export notebook</button><button class="danger" id="delete-all">Delete all local data</button></div></div>';
}
