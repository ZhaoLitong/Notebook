import type { AppState } from './domain.js';
import { t } from './i18n.js';

export type DataCategory = 'notebook' | 'documents' | 'sync' | 'preferences';

export function localDataGroups(state: AppState): { id: DataCategory; label: string; detail: string }[] {
  const language = state.language;
  const count = (value: number, singular: Parameters<typeof t>[1], plural: Parameters<typeof t>[1]) =>
    `${value} ${t(language, value === 1 ? singular : plural)}`;
  const activeNotes = state.fragments.filter((fragment) => !fragment.deletedAt).length;
  const drafts = Object.values(state.drafts).filter((draft) => draft.trim()).length;
  return [
    {
      id: 'notebook', label: t(language, 'notebookData'),
      detail: [count(state.pages.length, 'page', 'pages'), count(activeNotes, 'note', 'notes'),
        count(drafts, 'draft', 'drafts'), count(Math.max(0, state.notebooks.length - 1), 'notebook', 'notebooks')].join(', '),
    },
    {
      id: 'documents', label: t(language, 'documentData'),
      detail: count(state.documents.length, 'document', 'documents'),
    },
    {
      id: 'sync', label: t(language, 'syncData'),
      detail: count(state.outbox.length, 'syncEvent', 'syncEvents'),
    },
    {
      id: 'preferences', label: t(language, 'preferenceData'),
      detail: `${t(language, 'language')}: ${t(language, language === 'zh' ? 'chinese' : 'english')}`,
    },
  ];
}
