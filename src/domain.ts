export type View = 'home' | 'docs' | 'search' | 'settings';
export type Classification = 'note' | 'action' | 'decision' | 'question';

export interface Notebook { id: string; name: string }
export interface Page {
  id: string;
  notebookId: string;
  title: string;
  template: 'general' | 'meeting';
  meeting: { participants: string; agenda: string };
  createdAt: string;
  updatedAt: string;
}
export interface Fragment {
  id: string;
  pageId: string;
  content: string;
  classification: Classification;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
export interface DocumentRecord { id: string; filename: string; content: string; createdAt: string; updatedAt: string }
export interface OutboxEvent {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
  status: 'pending' | 'offline' | 'synced';
}
export interface AppState {
  notebooks: Notebook[];
  pages: Page[];
  fragments: Fragment[];
  documents: DocumentRecord[];
  outbox: OutboxEvent[];
  drafts: Record<string, string>;
  view: View;
  selectedPage?: string;
  activeDoc?: string;
  query?: string;
}

export const initialState: AppState = {
  notebooks: [{ id: 'nb-default', name: 'Personal' }],
  pages: [],
  fragments: [],
  documents: [],
  outbox: [],
  drafts: {},
  view: 'home',
};

export const createId = (): string => crypto.randomUUID();
export const now = (): string => new Date().toISOString();
export const currentPage = (state: AppState): Page | undefined =>
  state.pages.find((page) => page.id === state.selectedPage) ?? state.pages[0];

export function searchResults(state: AppState) {
  const query = (state.query ?? '').trim().toLowerCase();
  const pages = state.pages.map((page) => ({ type: 'Page', title: page.title, text: page.title, id: page.id }));
  const fragments = state.fragments
    .filter((item) => !item.deletedAt)
    .map((item) => ({
      type: item.classification,
      title: state.pages.find((page) => page.id === item.pageId)?.title ?? 'Page',
      text: item.content,
      id: item.pageId,
    }));
  const documents = state.documents.map((doc) => ({ type: 'Document', title: doc.filename, text: doc.content, id: doc.id }));
  return [...pages, ...fragments, ...documents].filter(
    (item) => !query || `${item.title} ${item.text}`.toLowerCase().includes(query),
  );
}
