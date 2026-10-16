import { AppState, Classification, createId, currentPage, initialState, now, Page, View } from './src/domain.js';
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

function render(): void {
  if (!root) return;
  root.innerHTML = renderApp(state);
  renderStatus();
}

function persist(): void {
  const emptyIds = new Set(state.pages.filter(isEmptyPage).map((page) => page.id));
  const savedState = emptyIds.size ? {
    ...state,
    pages: state.pages.filter((page) => !emptyIds.has(page.id)),
    drafts: Object.fromEntries(Object.entries(state.drafts).filter(([id]) => !emptyIds.has(id))),
    outbox: state.outbox.filter((item) => {
      const payload = item.payload as { id?: string } | undefined;
      return !(item.type.startsWith('page.') && payload?.id && emptyIds.has(payload.id));
    }),
    selectedPage: state.selectedPage && emptyIds.has(state.selectedPage) ? undefined : state.selectedPage,
  } : state;
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

function discardEmptyActiveDocument(): void {
  syncActiveDocumentFromEditor();
  const doc = state.documents.find((item) => item.id === state.activeDoc);
  if (!doc || doc.content.trim()) return;
  state.documents = state.documents.filter((item) => item.id !== doc.id);
  state.outbox = state.outbox.filter((item) => {
    const payload = item.payload as { id?: string } | undefined;
    return payload?.id !== doc.id;
  });
  state.activeDoc = state.documents[0]?.id;
  persist();
}

function isEmptyPage(page: Page): boolean {
  const defaultTitle = page.template === 'meeting' ? 'Meeting minutes' : 'Untitled page';
  return (!page.title.trim() || page.title === defaultTitle)
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
    ? `${state.outbox.filter((item) => item.status !== 'synced').length} pending sync`
    : 'Offline - changes saved locally';
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
  URL.revokeObjectURL(link.href);
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

function onClick(event: MouseEvent): void {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-view], [data-page], [data-doc], [data-result], #new-page, #meeting, #quick-note, #new-notebook, #save-fragment, #dictate, #new-doc, #save-doc, #export-doc, #export-all, #delete-all, [data-delete]') : null;
  if (!target) return;

  if (target.dataset.view || target.dataset.page || target.dataset.doc || target.dataset.result || target.id === 'new-doc' || target.id === 'new-page' || target.id === 'meeting' || target.id === 'quick-note' || target.id === 'new-notebook' || target.id === 'export-doc') {
    discardEmptyActiveDocument();
  }

  if (target.dataset.view || target.dataset.page || target.dataset.doc || target.dataset.result || target.id === 'new-doc' || target.id === 'new-page' || target.id === 'meeting') {
    discardEmptyCurrentPage();
  }

  if (target.dataset.view) { state.view = target.dataset.view as View; render(); }
  else if (target.dataset.page) { state.selectedPage = target.dataset.page; state.view = 'home'; render(); }
  else if (target.dataset.doc) { state.activeDoc = target.dataset.doc; render(); }
  else if (target.dataset.result) {
    if (target.dataset.type === 'Document') { state.activeDoc = target.dataset.result; state.view = 'docs'; }
    else { state.selectedPage = target.dataset.result; state.view = 'home'; }
    render();
  } else if (target.id === 'new-page') makePage();
  else if (target.id === 'meeting') makePage('meeting');
  else if (target.id === 'quick-note') { if (!currentPage(state)) makePage(); else document.querySelector<HTMLTextAreaElement>('#capture')?.focus(); }
  else if (target.id === 'new-notebook') {
    const name = prompt('Notebook name');
    if (name) { const notebook = { id: createId(), name }; state.notebooks.push(notebook); queue('notebook.create', notebook); }
  } else if (target.id === 'save-fragment') saveFragment();
  else if (target.id === 'dictate') dictate();
  else if (target.dataset.delete) {
    if (confirm('Delete this fragment?')) {
      const fragment = state.fragments.find((item) => item.id === target.dataset.delete);
      if (fragment) { fragment.deletedAt = now(); queue('fragment.delete', fragment); }
    }
  } else if (target.id === 'new-doc') {
    const timestamp = now();
    const doc = { id: createId(), filename: 'untitled.md', content: '', createdAt: timestamp, updatedAt: timestamp };
    state.documents.unshift(doc); state.activeDoc = doc.id; queue('document.create', doc);
  } else if (target.id === 'save-doc') saveDocument();
  else if (target.id === 'export-doc') {
    const doc = state.documents.find((item) => item.id === state.activeDoc);
    if (doc) download(doc.filename, doc.content);
  } else if (target.id === 'export-all') download('notebook-export.json', JSON.stringify(state, null, 2), 'application/json');
  else if (target.id === 'delete-all' && confirm('Delete all local notebook data?')) {
    state = structuredClone(initialState); persist(); render(); toast('Local data deleted');
  }
}

function onInput(event: Event): void {
  if (event.target instanceof HTMLTextAreaElement && event.target.id === 'capture') {
    const page = currentPage(state);
    if (page) { state.drafts[page.id] = event.target.value; persist(); }
  }
}

function onChange(event: Event): void {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.id === 'upload') {
    void importDocument(target.files?.[0]);
  } else if (target instanceof HTMLSelectElement && target.dataset.classify) {
    const fragment = state.fragments.find((item) => item.id === target.dataset.classify);
    if (fragment) { fragment.classification = target.value as Classification; fragment.updatedAt = now(); queue('fragment.update', fragment); }
  } else if (target instanceof HTMLInputElement && target.id === 'page-title') {
    const page = currentPage(state);
    if (page) { page.title = target.value; page.updatedAt = now(); queue('page.update', page); }
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
  toast('Saved locally');
}

function saveDocument(): void {
  const doc = state.documents.find((item) => item.id === state.activeDoc);
  const name = document.querySelector<HTMLInputElement>('#doc-name');
  const content = document.querySelector<HTMLTextAreaElement>('#doc-content');
  if (!doc || !name || !content) return;
  doc.filename = name.value; doc.content = content.value; doc.updatedAt = now();
  if (!doc.content.trim()) {
    discardEmptyActiveDocument(); render(); return;
  }
  queue('document.update', doc); toast('Document saved');
}

async function importDocument(file?: File): Promise<void> {
  if (!file) return;
  const timestamp = now();
  const doc = { id: createId(), filename: file.name, content: await file.text(), createdAt: timestamp, updatedAt: timestamp };
  state.documents.unshift(doc); state.activeDoc = doc.id; queue('document.create', doc);
}

function dictate(): void {
  const speechWindow = window as SpeechRecognitionWindow;
  const Speech = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  if (!Speech) { toast('Dictation is unavailable. You can type your note instead.'); return; }
  const recognition = new Speech();
  recognition.lang = 'en-US'; recognition.interimResults = false;
  recognition.onresult = (event) => {
    const capture = document.querySelector<HTMLTextAreaElement>('#capture');
    if (!capture) return;
    capture.value += (capture.value ? ' ' : '') + event.results[0][0].transcript;
    capture.dispatchEvent(new Event('input', { bubbles: true }));
  };
  recognition.onerror = () => toast('Dictation failed. Typed capture remains available.');
  recognition.start(); toast('Listening');
}

root?.addEventListener('click', onClick);
root?.addEventListener('input', onInput);
root?.addEventListener('change', onChange);
root?.addEventListener('keydown', onKeyDown);
window.addEventListener('online', () => {
  state.outbox.forEach((item) => { if (item.status === 'offline') item.status = 'pending'; });
  persist(); renderStatus(); toast('Online - pending changes ready to sync');
});
window.addEventListener('offline', renderStatus);
window.addEventListener('beforeunload', () => {
  discardEmptyActiveDocument();
  discardEmptyCurrentPage();
});

async function start(): Promise<void> {
  try {
    await store.open();
    state = { ...initialState, ...(await store.load()) };
    discardEmptyPages(state.pages);
  } catch {
    if (root) root.textContent = 'This browser does not support local storage.';
    return;
  }
  render();
}

start();
