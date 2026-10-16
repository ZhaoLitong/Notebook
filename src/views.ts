import { AppState, currentPage, Page, searchResults, View } from './domain.js';
import { classificationLabel, formatDate, pageTitle, t } from './i18n.js';
import { localDataGroups } from './local-data.js';

export function escapeHtml(value: string | undefined = ''): string {
  return String(value).replace(/[&<>\'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]!);
}

const viewTitle: Record<View, Parameters<typeof t>[1]> = {
  home: 'homeTitle', notes: 'notesTitle', docs: 'docsTitle', search: 'searchTitle', settings: 'settingsTitle',
};

export function renderApp(state: AppState, documentMode: 'edit' | 'split' | 'preview' = 'split', storedDocumentIds: ReadonlySet<string> = new Set()): string {
  const content = state.view === 'home' ? renderHome(state)
    : state.view === 'notes' ? renderNotes(state)
      : state.view === 'docs' ? renderDocuments(state, documentMode, storedDocumentIds)
      : state.view === 'search' ? renderSearch(state)
        : renderSettings(state);
  return `<div class="shell">${renderSidebar(state)}<main class="main"><header class="topbar"><h1>${t(state.language, viewTitle[state.view])}</h1><input class="search" id="global-search" aria-label="${t(state.language, 'searchPlaceholder')}" placeholder="${t(state.language, 'searchPlaceholder')}" value="${state.view === 'search' ? escapeHtml(state.query || '') : ''}"></header><section class="content${state.view === 'docs' ? ' documents-content' : ''}">${content}</section></main></div>`;
}

function renderSidebar(state: AppState): string {
  const navigation = [
    ['home', 'recentPages'], ['notes', 'allNotes'], ['docs', 'textDocuments'], ['search', 'searchTitle'], ['settings', 'settingsTitle'],
  ] as const;
  return `<aside class="sidebar"><div class="brand">${t(state.language, 'brand')}</div><nav class="nav">${navigation.map(([key, title]) => `<button data-view="${key}" class="${state.view === key ? 'active' : ''}">${t(state.language, title)}</button>`).join('')}</nav><div class="status" id="sync-status"></div></aside>`;
}

function renderHome(state: AppState): string {
  const page = currentPage(state);
  const language = state.language;
  return `<div class="toolbar"><div><h2>${page ? escapeHtml(pageTitle(page, language)) : t(language, 'yourNotebook')}</h2><div class="muted">${t(language, page ? 'captureHint' : 'startHint')}</div></div><div class="actions"><button class="secondary" id="new-notebook">${t(language, 'newNotebook')}</button><button class="primary" id="new-page">${t(language, 'newPage')}</button><button class="secondary" id="quick-note">${t(language, 'quickNote')}</button><button class="secondary" id="meeting">${t(language, 'meetingMinutes')}</button></div></div><div class="layout"><div class="panel">${page ? renderEditor(state, page) : `<div class="empty">${t(language, 'noPagesYet')}</div>`}</div><aside class="panel"><h2>${t(language, 'pages')}</h2><div class="page-list">${state.pages.map((item) => `<button class="page-item ${item.id === state.selectedPage ? 'selected' : ''}" data-page="${item.id}"><strong>${escapeHtml(pageTitle(item, language))}</strong><span class="muted">${formatDate(item.updatedAt, language)}</span></button>`).join('') || `<div class="muted">${t(language, 'noPages')}</div>`}</div></aside></div>`;
}

function renderEditor(state: AppState, page: Page): string {
  const fragments = state.fragments.filter((fragment) => fragment.pageId === page.id && !fragment.deletedAt);
  const language = state.language;
  const meetingFields = page.template === 'meeting' ? `<div class="field"><label for="participants">${t(language, 'participants')}</label><input id="participants" value="${escapeHtml(page.meeting?.participants || '')}" placeholder="${t(language, 'participantsPlaceholder')}"></div><div class="field"><label for="agenda">${t(language, 'agenda')}</label><textarea id="agenda">${escapeHtml(page.meeting?.agenda || '')}</textarea></div>` : '';
  return `<div class="field"><label for="page-title">${t(language, 'pageTitle')}</label><input id="page-title" value="${escapeHtml(pageTitle(page, language))}"></div>${meetingFields}<div class="capture"><textarea id="capture" placeholder="${t(language, 'capturePlaceholder')}">${escapeHtml(state.drafts?.[page.id] || '')}</textarea><div class="capture-actions"><button class="primary" id="save-fragment">${t(language, 'saveFragment')}</button><button class="secondary icon" id="dictate" title="${t(language, 'dictate')}" aria-label="${t(language, 'dictate')}">${t(language, 'mic')}</button></div></div><div class="fragment-list">${fragments.map((fragment) => renderFragment(fragment, state)).join('') || `<div class="empty">${t(language, 'emptyFragments')}</div>`}</div>`;
}

function renderFragment(fragment: AppState['fragments'][number], state: AppState): string {
  const classifications = ['note', 'action', 'decision', 'question'] as const;
  return `<article class="fragment"><div class="fragment-head"><span>${formatDate(fragment.createdAt, state.language, true)}</span><span><select data-classify="${fragment.id}" aria-label="${t(state.language, 'classification')}">${classifications.map((value) => `<option value="${value}" ${fragment.classification === value ? 'selected' : ''}>${classificationLabel(state.language, value)}</option>`).join('')}</select> <button class="danger" data-delete="${fragment.id}">${t(state.language, 'delete')}</button></span></div><p>${escapeHtml(fragment.content)}</p></article>`;
}

function renderNotes(state: AppState): string {
  const notes = state.fragments
    .filter((fragment) => !fragment.deletedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pages = [...state.pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const items = pages.map((page) => {
    const pageNotes = notes.filter((note) => note.pageId === page.id);
    const details = [state.drafts[page.id], page.meeting.agenda].filter((value) => value?.trim()).join('\n');
    return `<section class="note-page"><div class="note-meta"><div><strong>${escapeHtml(pageTitle(page, state.language))}</strong><div>${formatDate(page.updatedAt, state.language, true)} &middot; ${pageNotes.length} ${t(state.language, pageNotes.length === 1 ? 'savedNote' : 'savedNotes')}</div></div><button class="danger" data-delete-page="${page.id}" aria-label="${t(state.language, 'deletePage')} ${escapeHtml(pageTitle(page, state.language))}">${t(state.language, 'deletePage')}</button></div>${details ? `<p>${escapeHtml(details)}</p>` : ''}${pageNotes.map((note) => `<article class="note-item"><div class="note-meta"><span>${classificationLabel(state.language, note.classification)} &middot; ${formatDate(note.createdAt, state.language, true)}</span><button class="danger" data-delete="${note.id}" aria-label="${t(state.language, 'deleteNote')}">${t(state.language, 'deleteNote')}</button></div><p>${escapeHtml(note.content)}</p></article>`).join('')}</section>`;
  }).join('');
  return `<div class="toolbar"><h2>${t(state.language, 'allNotes')}</h2><span class="muted">${pages.length} ${t(state.language, pages.length === 1 ? 'page' : 'pages')} &middot; ${notes.length} ${t(state.language, notes.length === 1 ? 'savedNote' : 'savedNotes')}</span></div><div class="note-list">${items || `<div class="empty">${t(state.language, 'noNotes')}</div>`}</div>`;
}

function renderDocuments(state: AppState, documentMode: 'edit' | 'split' | 'preview', storedDocumentIds: ReadonlySet<string>): string {
  const doc = state.documents.find((item) => item.id === state.activeDoc) || state.documents[0];
  const language = state.language;
  const editor = doc ? `<div class="field"><label for="doc-name">${t(language, 'filename')}</label><input id="doc-name" value="${escapeHtml(doc.filename)}"></div><div class="doc-view-modes" role="group" aria-label="${t(language, 'documentView')}">${(['edit', 'split', 'preview'] as const).map((mode) => `<button type="button" data-doc-mode="${mode}" aria-pressed="${documentMode === mode}">${t(language, mode)}</button>`).join('')}</div><div class="document-workspace" data-mode="${documentMode}"><section class="document-pane document-edit"><h3>${t(language, 'edit')}</h3><textarea class="doc-editor" id="doc-content" aria-label="${t(language, 'textDocuments')}">${escapeHtml(doc.content)}</textarea></section><section class="document-pane document-preview"><h3>${t(language, 'preview')}</h3><div class="markdown-preview" id="markdown-preview"></div></section></div><div class="actions document-actions"><button class="primary" id="save-doc">${t(language, 'saveDocument')}</button><button class="secondary" id="export-doc">${t(language, 'export')}</button></div>` : `<div class="empty">${t(language, 'chooseDocument')}</div>`;
  const stored = state.documents.filter((item) => item.id !== doc?.id && storedDocumentIds.has(item.id));
  return `<div class="toolbar"><div><h2>${t(language, 'textDocuments')}</h2><div class="muted">${t(language, 'saveDocumentsHint')}</div></div><div class="actions"><label class="primary">${t(language, 'openDocument')}<input id="upload" type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" hidden></label><button class="secondary" id="new-doc">${t(language, 'newDocument')}</button></div></div>${stored.length ? `<div class="field stored-documents"><label for="stored-doc">${t(language, 'storedDocuments')}</label><select id="stored-doc"><option value="">${t(language, 'chooseDocument')}</option>${stored.map((item) => `<option value="${item.id}">${escapeHtml(item.filename)}</option>`).join('')}</select></div>` : ''}<div class="document-drop-zone" id="document-drop-zone"><span>${t(language, 'dropDocument')}</span><div class="panel">${editor}</div></div>`;
}

function renderSearch(state: AppState): string {
  const query = (state.query || '').trim();
  const results = searchResults(state);
  const language = state.language;
  const heading = query ? `${t(language, 'resultsFor')} "${escapeHtml(query)}"` : t(language, 'searchNotebook');
  return `<div class="panel"><h2>${heading}</h2>${results.map((item) => `<button class="page-item" data-result="${item.id}"><strong>${escapeHtml(item.title)}</strong><div>${escapeHtml(item.text.slice(0, 180))}</div><span class="muted">${item.type === 'Page' ? t(language, 'pageResult') : classificationLabel(language, item.type)}</span></button>`).join('') || `<div class="empty">${t(language, 'noMatches')}</div>`}</div>`;
}

function renderSettings(state: AppState): string {
  const language = state.language;
  const groups = localDataGroups(state).map((group) => `<label class="settings-row"><input type="checkbox" data-delete-category="${group.id}"><span><strong>${group.label}</strong><span class="muted">${escapeHtml(group.detail)}</span></span></label>`).join('');
  return `<div class="panel"><h2>${t(language, 'settingsData')}</h2><div class="field"><label for="language">${t(language, 'language')}</label><select id="language"><option value="en" ${language === 'en' ? 'selected' : ''}>${t(language, 'english')}</option><option value="zh" ${language === 'zh' ? 'selected' : ''}>${t(language, 'chinese')}</option></select></div><p class="muted">${t(language, 'storageHint')}</p><section class="settings-data"><h3>${t(language, 'localData')}</h3><p class="muted">${t(language, 'chooseData')} ${t(language, 'deviceFilesUnaffected')}</p><div class="settings-rows">${groups}</div><div class="actions"><button class="danger" id="delete-selected" disabled>${t(language, 'deleteSelected')}</button><button class="danger" id="delete-all">${t(language, 'deleteAll')}</button><button class="secondary" id="export-all">${t(language, 'exportNotebook')}</button></div></section></div>`;
}
