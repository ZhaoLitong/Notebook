import createDOMPurify from 'dompurify';
import { marked } from 'marked';
import { AppState, Classification, createId, currentPage, initialState, Language, now, Page, View } from './src/domain.js';
import { pageTitle, t } from './src/i18n.js';
import { DataCategory, localDataGroups } from './src/local-data.js';
import { LocalStateStore } from './src/persistence.js';
import { renderApp } from './src/views.js';

interface SpeechRecognitionResult { 0: { transcript: string }; isFinal: boolean }
interface SpeechRecognitionEvent extends Event { results: ArrayLike<SpeechRecognitionResult> }
interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  start(): void;
}
interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

const root = document.querySelector<HTMLElement>('#app');
const store = new LocalStateStore();
let state: AppState = structuredClone(initialState);
const legacyDocuments = new Map<string, AppState['documents'][number]>();
const purifier = createDOMPurify(window);
let documentMode: 'edit' | 'split' | 'preview' = window.matchMedia('(max-width: 1350px)').matches ? 'edit' : 'split';
let savedDocument = { id: '', filename: '', content: '' };
let draggingFile = false;

function render(): void {
  if (!root) return;
  document.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en';
  root.innerHTML = renderApp(state, documentMode, new Set(legacyDocuments.keys()));
  renderStatus();
  updateMarkdownPreview();
}

function updateMarkdownPreview(): void {
  const source = root?.querySelector<HTMLTextAreaElement>('#doc-content');
  const preview = root?.querySelector<HTMLElement>('#markdown-preview');
  if (!source || !preview) return;
  preview.classList.toggle('is-empty', !source.value.trim());
  if (!source.value.trim()) {
    preview.textContent = t(state.language, 'emptyPreview');
    return;
  }
  preview.innerHTML = purifier.sanitize(marked.parse(source.value, { async: false }), {
    USE_PROFILES: { html: true },
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ['id', 'name'],
    FORBID_TAGS: ['button', 'form', 'input', 'label', 'select', 'textarea'],
  });
  preview.querySelectorAll('a').forEach((link) => {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
}

function setDocumentMode(mode: 'edit' | 'split' | 'preview'): void {
  documentMode = mode;
  const workspace = root?.querySelector<HTMLElement>('.document-workspace');
  if (workspace) workspace.dataset.mode = mode;
  root?.querySelectorAll<HTMLButtonElement>('[data-doc-mode]').forEach((button) => {
    const selected = button.dataset.docMode === mode;
    button.setAttribute('aria-pressed', String(selected));
  });
  if (mode === 'preview') updateMarkdownPreview();
}

function persist(): void {
  const emptyIds = new Set(state.pages.filter(isEmptyPage).map((page) => page.id));
  const savedState: AppState = {
    ...state,
    pages: state.pages.filter((page) => !emptyIds.has(page.id)),
    drafts: Object.fromEntries(Object.entries(state.drafts).filter(([id]) => !emptyIds.has(id))),
    outbox: state.outbox.filter((item) => {
      const payload = item.payload as { id?: string } | undefined;
      return !item.type.startsWith('document.')
        && !(item.type.startsWith('page.') && payload?.id && emptyIds.has(payload.id));
    }),
    selectedPage: state.selectedPage && emptyIds.has(state.selectedPage) ? undefined : state.selectedPage,
    activeDoc: state.activeDoc && legacyDocuments.has(state.activeDoc) ? state.activeDoc : undefined,
    documents: [...legacyDocuments.values()],
  };
  try { store.save(savedState); } catch { /* The app remains usable for the current session. */ }
  renderStatus();
}

function syncActiveDocumentFromEditor(): void {
  const doc = state.documents.find((item) => item.id === state.activeDoc);
  const name = document.querySelector<HTMLInputElement>('#doc-name');
  const content = document.querySelector<HTMLTextAreaElement>('#doc-content');
  if (doc && name && content) {
    doc.filename = name.value;
    doc.content = content.value;
  }
}

function activeDocument(): AppState['documents'][number] | undefined {
  return state.documents.find((item) => item.id === state.activeDoc);
}

function hasUnsavedDocument(): boolean {
  syncActiveDocumentFromEditor();
  const doc = activeDocument();
  return !!doc && (doc.id !== savedDocument.id || doc.filename !== savedDocument.filename || doc.content !== savedDocument.content)
    && !!(doc.content.trim() || doc.filename !== 'untitled.md');
}

function allowDocumentReplacement(): boolean {
  return !hasUnsavedDocument() || confirm(t(state.language, 'unsavedDocument'));
}

function replaceDocument(doc: AppState['documents'][number]): void {
  state.documents = [doc, ...state.documents.filter((item) => item.id !== doc.id && legacyDocuments.has(item.id))];
  state.activeDoc = doc.id;
  savedDocument = legacyDocuments.has(doc.id)
    ? { id: doc.id, filename: doc.filename, content: doc.content }
    : { id: '', filename: '', content: '' };
  documentMode = 'edit';
  render();
}

function discardEmptyActiveDocument(): void {
  syncActiveDocumentFromEditor();
  const doc = state.documents.find((item) => item.id === state.activeDoc);
  if (!doc || doc.content.trim()) return;
  state.documents = state.documents.filter((item) => item.id !== doc.id);
  legacyDocuments.delete(doc.id);
  state.outbox = state.outbox.filter((item) => {
    const payload = item.payload as { id?: string } | undefined;
    return payload?.id !== doc.id;
  });
  state.activeDoc = state.documents[0]?.id;
  persist();
}

function isEmptyPage(page: Page): boolean {
  const defaultTitle = page.template === 'meeting' ? 'Meeting minutes' : 'Untitled page';
  const chineseDefault = page.template === 'meeting' ? t('zh', 'meetingMinutes') : t('zh', 'untitledPage');
  return (!page.title.trim() || page.title === defaultTitle || page.title === chineseDefault)
    && !page.meeting.participants.trim()
    && !page.meeting.agenda.trim()
    && !state.drafts[page.id]?.trim()
    && !state.fragments.some((fragment) => fragment.pageId === page.id && !fragment.deletedAt);
}

function discardEmptyPages(pages: Page[]): void {
  const ids = new Set(pages.filter(isEmptyPage).map((page) => page.id));
  if (!ids.size) return;
  state.pages = state.pages.filter((page) => !ids.has(page.id));
  for (const id of ids) delete state.drafts[id];
  state.outbox = state.outbox.filter((item) => {
    const payload = item.payload as { id?: string } | undefined;
    return !(item.type.startsWith('page.') && payload?.id && ids.has(payload.id));
  });
  if (state.selectedPage && ids.has(state.selectedPage)) state.selectedPage = state.pages[0]?.id;
  persist();
}

function discardEmptyCurrentPage(): void {
  const page = currentPage(state);
  if (page) discardEmptyPages([page]);
}

function queue(type: string, payload: unknown): void {
  state.outbox.push({ id: createId(), type, payload, createdAt: now(), status: navigator.onLine ? 'pending' : 'offline' });
  persist();
  render();
}

function renderStatus(): void {
  const status = document.querySelector<HTMLElement>('#sync-status');
  if (status) status.textContent = navigator.onLine
    ? `${state.outbox.filter((item) => item.status !== 'synced').length} ${t(state.language, 'pendingSync')}`
    : t(state.language, 'offlineSaved');
}

function toast(message: string): void {
  const item = document.createElement('div');
  item.className = 'toast';
  item.textContent = message;
  document.body.append(item);
  setTimeout(() => item.remove(), 2200);
}

function download(name: string, content: string, type = 'text/plain'): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function makePage(template: Page['template'] = 'general'): void {
  const timestamp = now();
  const page: Page = {
    id: createId(), notebookId: 'nb-default', title: template === 'meeting' ? 'Meeting minutes' : 'Untitled page',
    template, meeting: { participants: '', agenda: '' }, createdAt: timestamp, updatedAt: timestamp,
  };
  state.pages.unshift(page);
  state.selectedPage = page.id;
  state.view = 'home';
  queue('page.create', page);
}

function deleteLocalData(categories: DataCategory[], all = false): void {
  const groups = localDataGroups(state).filter((group) => categories.includes(group.id));
  if (!groups.length) return;
  const message = `${t(state.language, all ? 'confirmDeleteAllData' : 'confirmDeleteSelected')}\n\n${groups.map((group) => `${group.label}: ${group.detail}`).join('\n')}\n\n${t(state.language, 'deviceFilesUnaffected')}`;
  if (!confirm(message)) return;

  if (all) {
    state = { ...structuredClone(initialState), view: 'settings' };
    legacyDocuments.clear();
  } else {
    if (categories.includes('notebook')) {
      state.notebooks = structuredClone(initialState.notebooks);
      state.pages = [];
      state.fragments = [];
      state.drafts = {};
      state.selectedPage = undefined;
      state.query = undefined;
      state.outbox = state.outbox.filter((item) => !/^(notebook|page|fragment)\./.test(item.type));
    }
    if (categories.includes('documents')) {
      state.documents = [];
      state.activeDoc = undefined;
      legacyDocuments.clear();
      state.outbox = state.outbox.filter((item) => !item.type.startsWith('document.'));
    }
    if (categories.includes('sync')) state.outbox = [];
    if (categories.includes('preferences')) {
      state.language = initialState.language;
      state.query = undefined;
    }
  }
  persist(); render(); toast(t(state.language, 'localDataDeleted'));
}

function onClick(event: MouseEvent): void {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-view], [data-page], [data-doc], [data-doc-mode], [data-result], #new-page, #meeting, #quick-note, #new-notebook, #save-fragment, #dictate, #new-doc, #save-doc, #export-doc, #export-all, #delete-selected, #delete-all, [data-delete], [data-delete-page]') : null;
  if (!target) return;

  if (state.view === 'docs' && target.dataset.view && target.dataset.view !== 'docs' && !allowDocumentReplacement()) return;
  if (target.id === 'new-doc' && !allowDocumentReplacement()) return;

  if (target.dataset.view || target.dataset.page || target.dataset.doc || target.dataset.result || target.id === 'new-doc' || target.id === 'new-page' || target.id === 'meeting' || target.id === 'quick-note' || target.id === 'new-notebook' || target.id === 'export-doc') {
    discardEmptyActiveDocument();
  }

  if (target.dataset.view || target.dataset.page || target.dataset.doc || target.dataset.result || target.id === 'new-doc' || target.id === 'new-page' || target.id === 'meeting') {
    discardEmptyCurrentPage();
  }

  if (target.dataset.view) { state.view = target.dataset.view as View; render(); }
  else if (target.dataset.page) { state.selectedPage = target.dataset.page; state.view = 'home'; render(); }
  else if (target.dataset.doc) { state.activeDoc = target.dataset.doc; render(); }
  else if (target.dataset.docMode === 'edit' || target.dataset.docMode === 'split' || target.dataset.docMode === 'preview') setDocumentMode(target.dataset.docMode);
  else if (target.dataset.result) {
    state.selectedPage = target.dataset.result; state.view = 'home';
    render();
  } else if (target.id === 'new-page') makePage();
  else if (target.id === 'meeting') makePage('meeting');
  else if (target.id === 'quick-note') { if (!currentPage(state)) makePage(); else document.querySelector<HTMLTextAreaElement>('#capture')?.focus(); }
  else if (target.id === 'new-notebook') {
    const name = prompt(t(state.language, 'notebookName'));
    if (name) { const notebook = { id: createId(), name }; state.notebooks.push(notebook); queue('notebook.create', notebook); }
  } else if (target.id === 'save-fragment') saveFragment();
  else if (target.id === 'dictate') dictate();
  else if (target.dataset.delete) {
    if (confirm(t(state.language, 'confirmDeleteNote'))) {
      const fragment = state.fragments.find((item) => item.id === target.dataset.delete);
      if (fragment) { fragment.deletedAt = now(); queue('fragment.delete', fragment); }
    }
  } else if (target.dataset.deletePage) {
    const page = state.pages.find((item) => item.id === target.dataset.deletePage);
    if (page && confirm(`${t(state.language, 'confirmDeletePage')} "${pageTitle(page, state.language)}"`)) {
      const fragmentIds = new Set(state.fragments.filter((item) => item.pageId === page.id).map((item) => item.id));
      state.pages = state.pages.filter((item) => item.id !== page.id);
      state.fragments = state.fragments.filter((item) => item.pageId !== page.id);
      delete state.drafts[page.id];
      state.outbox = state.outbox.filter((item) => {
        const payload = item.payload as { id?: string } | undefined;
        return !(item.type.startsWith('fragment.') && payload?.id && fragmentIds.has(payload.id) && item.status !== 'synced');
      });
      if (state.selectedPage === page.id) state.selectedPage = state.pages[0]?.id;
      queue('page.delete', page);
    }
  } else if (target.id === 'new-doc') {
    const timestamp = now();
    const doc = { id: createId(), filename: 'untitled.md', content: '', createdAt: timestamp, updatedAt: timestamp };
    replaceDocument(doc);
  } else if (target.id === 'save-doc') void saveDocument();
  else if (target.id === 'export-doc') {
    syncActiveDocumentFromEditor();
    const doc = state.documents.find((item) => item.id === state.activeDoc);
    if (doc) {
      download(doc.filename, doc.content);
      savedDocument = { id: doc.id, filename: doc.filename, content: doc.content };
    }
  } else if (target.id === 'export-all') download('notebook-export.json', JSON.stringify(state, null, 2), 'application/json');
  else if (target.id === 'delete-selected') {
    const selected = [...(root?.querySelectorAll<HTMLInputElement>('[data-delete-category]:checked') || [])]
      .map((input) => input.dataset.deleteCategory as DataCategory);
    deleteLocalData(selected);
  } else if (target.id === 'delete-all') deleteLocalData(localDataGroups(state).map((group) => group.id), true);
}

function onInput(event: Event): void {
  if (event.target instanceof HTMLTextAreaElement && event.target.id === 'capture') {
    const page = currentPage(state);
    if (page) { state.drafts[page.id] = event.target.value; persist(); }
  } else if (event.target instanceof HTMLTextAreaElement && event.target.id === 'doc-content') {
    syncActiveDocumentFromEditor();
    updateMarkdownPreview();
  } else if (event.target instanceof HTMLInputElement && event.target.id === 'doc-name') {
    syncActiveDocumentFromEditor();
  }
}

function onChange(event: Event): void {
  const target = event.target;
  if (target instanceof HTMLSelectElement && target.id === 'language') {
    state.language = target.value as Language;
    persist(); render();
  } else if (target instanceof HTMLInputElement && target.dataset.deleteCategory) {
    const button = root?.querySelector<HTMLButtonElement>('#delete-selected');
    if (button) button.disabled = !root?.querySelector('[data-delete-category]:checked');
  } else if (target instanceof HTMLInputElement && target.id === 'upload') {
    void importDocument(target.files?.[0]);
    target.value = '';
  } else if (target instanceof HTMLSelectElement && target.id === 'stored-doc' && target.value) {
    if (!allowDocumentReplacement()) { target.value = ''; return; }
    const doc = state.documents.find((item) => item.id === target.value);
    if (doc) replaceDocument(doc);
  } else if (target instanceof HTMLSelectElement && target.dataset.classify) {
    const fragment = state.fragments.find((item) => item.id === target.dataset.classify);
    if (fragment) { fragment.classification = target.value as Classification; fragment.updatedAt = now(); queue('fragment.update', fragment); }
  } else if (target instanceof HTMLInputElement && target.id === 'page-title') {
    const page = currentPage(state);
    if (page) {
      const defaultTitle = page.template === 'meeting' ? 'meetingMinutes' : 'untitledPage';
      page.title = target.value === t(state.language, defaultTitle) ? (page.template === 'meeting' ? 'Meeting minutes' : 'Untitled page') : target.value;
      page.updatedAt = now(); queue('page.update', page);
    }
  } else if ((target instanceof HTMLInputElement && target.id === 'participants') || (target instanceof HTMLTextAreaElement && target.id === 'agenda')) {
    const page = currentPage(state);
    if (page) {
      if (target.id === 'participants') page.meeting.participants = target.value;
      else page.meeting.agenda = target.value;
      page.updatedAt = now(); queue('page.update', page);
    }
  }
}

function onKeyDown(event: KeyboardEvent): void {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.id === 'global-search' && event.key === 'Enter') {
    if (state.view === 'docs' && !allowDocumentReplacement()) return;
    discardEmptyActiveDocument(); discardEmptyCurrentPage(); state.query = target.value; state.view = 'search'; render();
  } else if (target instanceof HTMLTextAreaElement && target.id === 'capture' && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault(); saveFragment();
  }
}

function saveFragment(): void {
  const capture = document.querySelector<HTMLTextAreaElement>('#capture');
  const page = currentPage(state);
  if (!capture || !page || !capture.value.trim()) return;
  const timestamp = now();
  const fragment = { id: createId(), pageId: page.id, content: capture.value, classification: 'note' as const, createdAt: timestamp, updatedAt: timestamp };
  state.fragments.push(fragment);
  page.updatedAt = timestamp;
  state.drafts[page.id] = '';
  queue('fragment.create', fragment);
  toast(t(state.language, 'savedLocally'));
}

async function saveDocument(): Promise<void> {
  const doc = state.documents.find((item) => item.id === state.activeDoc);
  const name = document.querySelector<HTMLInputElement>('#doc-name');
  const content = document.querySelector<HTMLTextAreaElement>('#doc-content');
  if (!doc || !name || !content) return;
  if (!content.value.trim()) {
    discardEmptyActiveDocument(); render(); return;
  }
  const filename = name.value.trim() || 'untitled.md';
  const picker = window as Window & {
    showSaveFilePicker?: (options: { suggestedName: string }) => Promise<{
      name: string;
      createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>;
    }>;
  };
  if (!picker.showSaveFilePicker) {
    download(filename, content.value);
    doc.filename = filename;
    doc.content = content.value;
    savedDocument = { id: doc.id, filename, content: content.value };
    toast(t(state.language, 'downloadStarted'));
    return;
  }
  try {
    const handle = await picker.showSaveFilePicker({ suggestedName: filename });
    const writable = await handle.createWritable();
    await writable.write(content.value);
    await writable.close();
    doc.filename = handle.name;
    doc.content = content.value;
    doc.updatedAt = now();
    savedDocument = { id: doc.id, filename: doc.filename, content: doc.content };
    legacyDocuments.delete(doc.id);
    persist();
    render();
    toast(t(state.language, 'savedToDevice'));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    toast(t(state.language, 'saveFailed'));
  }
}

async function importDocument(file?: File): Promise<void> {
  if (!file) return;
  if (!/\.(md|markdown|txt)$/i.test(file.name)) { toast(t(state.language, 'invalidDocument')); return; }
  if (!allowDocumentReplacement()) return;
  const timestamp = now();
  const doc = { id: createId(), filename: file.name, content: await file.text(), createdAt: timestamp, updatedAt: timestamp };
  replaceDocument(doc);
}

function dictate(): void {
  const speechWindow = window as SpeechRecognitionWindow;
  const Speech = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  if (!Speech) { toast(t(state.language, 'dictateUnavailable')); return; }
  const recognition = new Speech();
  recognition.lang = 'en-US'; recognition.interimResults = false;
  recognition.onresult = (event) => {
    const capture = document.querySelector<HTMLTextAreaElement>('#capture');
    if (!capture) return;
    capture.value += (capture.value ? ' ' : '') + event.results[0][0].transcript;
    capture.dispatchEvent(new Event('input', { bubbles: true }));
  };
  recognition.onerror = () => toast(t(state.language, 'dictateFailed'));
  recognition.start(); toast(t(state.language, 'listening'));
}

root?.addEventListener('click', onClick);
root?.addEventListener('input', onInput);
root?.addEventListener('change', onChange);
root?.addEventListener('keydown', onKeyDown);
root?.addEventListener('dragenter', (event) => {
  if (state.view !== 'docs' || !event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault();
  draggingFile = true;
  root.querySelector('#document-drop-zone')?.classList.add('drag-over');
});
root?.addEventListener('dragover', (event) => {
  if (state.view === 'docs' && event.dataTransfer?.types.includes('Files')) event.preventDefault();
});
root?.addEventListener('dragleave', (event) => {
  if (!draggingFile || root?.contains(event.relatedTarget as Node)) return;
  draggingFile = false;
  root?.querySelector('#document-drop-zone')?.classList.remove('drag-over');
});
root?.addEventListener('drop', (event) => {
  if (state.view !== 'docs') return;
  event.preventDefault();
  draggingFile = false;
  root.querySelector('#document-drop-zone')?.classList.remove('drag-over');
  void importDocument(event.dataTransfer?.files[0]);
});
window.addEventListener('online', () => {
  state.outbox.forEach((item) => { if (item.status === 'offline') item.status = 'pending'; });
  persist(); renderStatus(); toast(t(state.language, 'onlineReady'));
});
window.addEventListener('offline', renderStatus);
window.addEventListener('beforeunload', (event) => {
  if (hasUnsavedDocument()) event.preventDefault();
  discardEmptyActiveDocument();
  discardEmptyCurrentPage();
});

async function start(): Promise<void> {
  try {
    await store.open();
    state = { ...initialState, ...(await store.load()) };
    state.view = 'home';
    for (const doc of state.documents) legacyDocuments.set(doc.id, structuredClone(doc));
    state.activeDoc = state.documents.find((doc) => doc.id === state.activeDoc)?.id ?? state.documents[0]?.id;
    const doc = activeDocument();
    if (doc) savedDocument = { id: doc.id, filename: doc.filename, content: doc.content };
    state.outbox = state.outbox.filter((item) => !item.type.startsWith('document.'));
    discardEmptyPages(state.pages);
  } catch {
    if (root) root.textContent = t(state.language, 'storageUnavailable');
    return;
  }
  render();
}

start();
