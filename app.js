const DB = 'notebook-mvp';
const initial = { notebooks: [{ id: 'nb-default', name: 'Personal' }], pages: [], fragments: [], documents: [], outbox: [], drafts: {}, view: 'home' };
let state = structuredClone(initial), db;
const $ = (selector) => document.querySelector(selector);
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => { db = request.result; resolve(); };
    request.onerror = () => reject(request.error);
  });
}
async function load() {
  try {
    await openDb();
    const request = db.transaction('state').objectStore('state').get('state');
    request.onsuccess = () => { if (request.result) state = { ...initial, ...request.result }; render(); };
    request.onerror = () => render();
  } catch { document.querySelector('#app').textContent = 'This browser does not support local storage.'; }
}
function persist() {
  if (db) db.transaction('state', 'readwrite').objectStore('state').put(state, 'state');
  renderStatus();
}
function queue(type, payload) {
  state.outbox.push({ id: id(), type, payload, createdAt: now(), status: navigator.onLine ? 'pending' : 'offline' });
  persist();
  render();
}
function escapeHtml(value = '') {
  return String(value).replace(/[&<>\'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
}
function currentPage() { return state.pages.find((page) => page.id === state.selectedPage) || state.pages[0]; }
function render() {
  const view = state.view;
  $('#app').innerHTML = `<div class="shell"><aside class="sidebar"><div class="brand">Notebook</div><nav class="nav"><button data-view="home" class="${view === 'home' ? 'active' : ''}">Recent pages</button><button data-view="docs" class="${view === 'docs' ? 'active' : ''}">Text documents</button><button data-view="search" class="${view === 'search' ? 'active' : ''}">Search</button><button data-view="settings" class="${view === 'settings' ? 'active' : ''}">Settings</button></nav><div class="status" id="sync-status"></div></aside><main class="main"><header class="topbar"><h1>${view === 'home' ? 'Capture and review' : view === 'docs' ? 'Documents' : view === 'search' ? 'Search' : 'Settings'}</h1><input class="search" id="global-search" placeholder="Search notes, tags, files" value="${view === 'search' ? escapeHtml(state.query || '') : ''}"></header><section class="content">${view === 'home' ? home() : view === 'docs' ? docs() : view === 'search' ? search() : settings()}</section></main></div>`;
  bind(); renderStatus();
}
function home() {
  const page = currentPage();
  return `<div class="toolbar"><div><h2 style="margin:0">${page ? escapeHtml(page.title) : 'Your notebook'}</h2><div class="muted">${page ? 'Capture fragments as you think.' : 'Start with a page or a quick note.'}</div></div><div class="actions"><button class="secondary" id="new-notebook">+ Notebook</button><button class="primary" id="new-page">+ New page</button><button class="secondary" id="quick-note">Quick note</button><button class="secondary" id="meeting">Meeting minutes</button></div></div><div class="layout"><div class="panel">${page ? editor(page) : '<div class="empty">No pages yet. Create one to begin.</div>'}</div><aside class="panel"><h2>Pages</h2><div class="page-list">${state.pages.map((item) => `<button class="page-item ${item.id === state.selectedPage ? 'selected' : ''}" data-page="${item.id}"><strong>${escapeHtml(item.title || 'Untitled page')}</strong><span class="muted">${new Date(item.updatedAt).toLocaleDateString()}</span></button>`).join('') || '<div class="muted">No pages</div>'}</div></aside></div>`;
}
function editor(page) {
  const fragments = state.fragments.filter((fragment) => fragment.pageId === page.id && !fragment.deletedAt);
  const meeting = page.template === 'meeting' ? `<div class="field"><label for="participants">PARTICIPANTS</label><input id="participants" value="${escapeHtml(page.meeting?.participants || '')}" placeholder="Names, separated by commas"></div><div class="field"><label for="agenda">AGENDA</label><textarea id="agenda">${escapeHtml(page.meeting?.agenda || '')}</textarea></div>` : '';
  return `<div class="field"><label for="page-title">PAGE TITLE</label><input id="page-title" value="${escapeHtml(page.title)}"></div>${meeting}<div class="capture"><textarea id="capture" placeholder="Capture a thought, action, decision, or question...">${escapeHtml(state.drafts?.[page.id] || '')}</textarea><div class="capture-actions"><button class="primary" id="save-fragment">Save fragment</button><button class="secondary icon" id="dictate" title="Dictate">Mic</button></div></div><div style="margin-top:20px">${fragments.map((fragment) => `<article class="fragment"><div class="fragment-head"><span>${new Date(fragment.createdAt).toLocaleString()}</span><span><select data-classify="${fragment.id}" aria-label="Classification"><option ${fragment.classification === 'note' ? 'selected' : ''}>note</option><option ${fragment.classification === 'action' ? 'selected' : ''}>action</option><option ${fragment.classification === 'decision' ? 'selected' : ''}>decision</option><option ${fragment.classification === 'question' ? 'selected' : ''}>question</option></select> <button class="danger" data-delete="${fragment.id}">Delete</button></span></div><p>${escapeHtml(fragment.content)}</p></article>`).join('') || '<div class="empty">Your saved fragments will appear here.</div>'}</div>`;
}
function docs() {
  const doc = state.documents.find((item) => item.id === state.activeDoc) || state.documents[0];
  return `<div class="toolbar"><div><h2 style="margin:0">Text documents</h2><div class="muted">Edit plain text and Markdown without notebook metadata.</div></div><div class="actions"><label class="primary">Upload<input id="upload" type="file" accept=".txt,.md,text/plain,text/markdown" hidden></label><button class="secondary" id="new-doc">+ New document</button></div></div><div class="doc-grid"><div class="doc-list">${state.documents.map((item) => `<button class="doc-item" data-doc="${item.id}"><strong>${escapeHtml(item.filename)}</strong><div class="muted">${new Date(item.updatedAt).toLocaleDateString()}</div></button>`).join('') || '<div class="muted">No documents yet.</div>'}</div><div class="panel">${doc ? `<div class="field"><label for="doc-name">FILENAME</label><input id="doc-name" value="${escapeHtml(doc.filename)}"></div><textarea class="doc-editor" id="doc-content">${escapeHtml(doc.content)}</textarea><div class="actions" style="margin-top:12px"><button class="primary" id="save-doc">Save document</button><button class="secondary" id="export-doc">Export</button></div>` : '<div class="empty">Choose or create a document.</div>'}</div></div>`;
}
function search() {
  const query = (state.query || '').trim().toLowerCase();
  const pages = state.pages.map((page) => ({ type: 'Page', title: page.title, text: page.title, id: page.id }));
  const fragments = state.fragments.filter((item) => !item.deletedAt).map((item) => ({ type: item.classification, title: state.pages.find((page) => page.id === item.pageId)?.title || 'Page', text: item.content, id: item.pageId }));
  const docsFound = state.documents.map((doc) => ({ type: 'Document', title: doc.filename, text: doc.content, id: doc.id }));
  const results = [...pages, ...fragments, ...docsFound].filter((item) => !query || `${item.title} ${item.text}`.toLowerCase().includes(query));
  return `<div class="panel"><h2>${query ? `Results for "${escapeHtml(query)}"` : 'Search your notebook'}</h2>${results.map((item) => `<button class="page-item" data-result="${item.id}" data-type="${item.type}"><strong>${escapeHtml(item.title)}</strong><div>${escapeHtml(item.text.slice(0, 180))}</div><span class="muted">${escapeHtml(item.type)}</span></button>`).join('') || '<div class="empty">No matches.</div>'}</div>`;
}
function settings() { return '<div class="panel"><h2>Settings and data</h2><p class="muted">Local-first storage is active. Changes are queued for synchronization when a server provider is configured.</p><div class="actions"><button class="primary" id="export-all">Export notebook</button><button class="danger" id="delete-all">Delete all local data</button></div></div>'; }
function renderStatus() { const el = $('#sync-status'); if (el) el.textContent = navigator.onLine ? `${state.outbox.filter((item) => item.status !== 'synced').length} pending sync` : 'Offline - changes saved locally'; }
function toast(message) { const item = document.createElement('div'); item.className = 'toast'; item.textContent = message; document.body.append(item); setTimeout(() => item.remove(), 2200); }
function download(name, content, type = 'text/plain') { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type })); link.download = name; link.click(); URL.revokeObjectURL(link.href); }
function makePage(template = 'general') {
  const page = { id: id(), notebookId: 'nb-default', title: template === 'meeting' ? 'Meeting minutes' : 'Untitled page', template, meeting: { participants: '', agenda: '' }, createdAt: now(), updatedAt: now() };
  state.pages.unshift(page); state.selectedPage = page.id; state.view = 'home'; queue('page.create', page);
}
function bind() {
  document.querySelectorAll('[data-view]').forEach((button) => button.onclick = () => { state.view = button.dataset.view; render(); });
  document.querySelectorAll('[data-page]').forEach((button) => button.onclick = () => { state.selectedPage = button.dataset.page; state.view = 'home'; render(); });
  document.querySelectorAll('[data-doc]').forEach((button) => button.onclick = () => { state.activeDoc = button.dataset.doc; render(); });
  $('#global-search')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { state.query = event.currentTarget.value; state.view = 'search'; render(); } });
  $('#new-page')?.addEventListener('click', () => makePage());
  $('#meeting')?.addEventListener('click', () => makePage('meeting'));
  $('#quick-note')?.addEventListener('click', () => { if (!currentPage()) makePage(); else $('#capture')?.focus(); });
  $('#new-notebook')?.addEventListener('click', () => { const name = prompt('Notebook name'); if (name) { const notebook = { id: id(), name }; state.notebooks.push(notebook); queue('notebook.create', notebook); } });
  $('#page-title')?.addEventListener('change', (event) => { const page = currentPage(); page.title = event.currentTarget.value; page.updatedAt = now(); queue('page.update', page); });
  $('#participants')?.addEventListener('change', (event) => { const page = currentPage(); page.meeting.participants = event.currentTarget.value; queue('page.update', page); });
  $('#agenda')?.addEventListener('change', (event) => { const page = currentPage(); page.meeting.agenda = event.currentTarget.value; queue('page.update', page); });
  $('#capture')?.addEventListener('input', (event) => { state.drafts[currentPage().id] = event.currentTarget.value; persist(); });
  $('#capture')?.addEventListener('keydown', (event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); $('#save-fragment').click(); } });
  $('#save-fragment')?.addEventListener('click', () => {
    const content = $('#capture').value;
    if (!content.trim()) return;
    const fragment = { id: id(), pageId: currentPage().id, content, classification: 'note', createdAt: now(), updatedAt: now() };
    state.fragments.push(fragment); currentPage().updatedAt = fragment.updatedAt; state.drafts[currentPage().id] = ''; queue('fragment.create', fragment); toast('Saved locally');
  });
  document.querySelectorAll('[data-classify]').forEach((select) => select.onchange = () => { const fragment = state.fragments.find((item) => item.id === select.dataset.classify); fragment.classification = select.value; fragment.updatedAt = now(); queue('fragment.update', fragment); });
  document.querySelectorAll('[data-delete]').forEach((button) => button.onclick = () => { if (confirm('Delete this fragment?')) { const fragment = state.fragments.find((item) => item.id === button.dataset.delete); fragment.deletedAt = now(); queue('fragment.delete', fragment); } });
  $('#dictate')?.addEventListener('click', dictate);
  $('#new-doc')?.addEventListener('click', () => { const doc = { id: id(), filename: 'untitled.md', content: '# Untitled\n', createdAt: now(), updatedAt: now() }; state.documents.unshift(doc); state.activeDoc = doc.id; queue('document.create', doc); });
  $('#upload')?.addEventListener('change', async (event) => { const file = event.target.files[0]; if (!file) return; const doc = { id: id(), filename: file.name, content: await file.text(), createdAt: now(), updatedAt: now() }; state.documents.unshift(doc); state.activeDoc = doc.id; queue('document.create', doc); });
  $('#save-doc')?.addEventListener('click', () => { const doc = state.documents.find((item) => item.id === state.activeDoc); doc.filename = $('#doc-name').value; doc.content = $('#doc-content').value; doc.updatedAt = now(); queue('document.update', doc); toast('Document saved'); });
  $('#export-doc')?.addEventListener('click', () => { const doc = state.documents.find((item) => item.id === state.activeDoc); download(doc.filename, doc.content); });
  $('#export-all')?.addEventListener('click', () => download('notebook-export.json', JSON.stringify(state, null, 2), 'application/json'));
  $('#delete-all')?.addEventListener('click', () => { if (confirm('Delete all local notebook data?')) { state = structuredClone(initial); persist(); render(); toast('Local data deleted'); } });
  document.querySelectorAll('[data-result]').forEach((button) => button.onclick = () => { if (button.dataset.type === 'Document') { state.activeDoc = button.dataset.result; state.view = 'docs'; } else { state.selectedPage = button.dataset.result; state.view = 'home'; } render(); });
}
function dictate() {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) { toast('Dictation is unavailable. You can type your note instead.'); return; }
  const recognition = new Speech(); recognition.lang = 'en-US'; recognition.interimResults = false;
  recognition.onresult = (event) => { const text = event.results[0][0].transcript; $('#capture').value += ($('#capture').value ? ' ' : '') + text; $('#capture').dispatchEvent(new Event('input')); };
  recognition.onerror = () => toast('Dictation failed. Typed capture remains available.');
  recognition.start(); toast('Listening');
}
window.addEventListener('online', () => { state.outbox.forEach((item) => { if (item.status === 'offline') item.status = 'pending'; }); persist(); renderStatus(); toast('Online - pending changes ready to sync'); });
window.addEventListener('offline', renderStatus);
load();
