import type { Classification, Language, Page } from './domain.js';

const en = {
  brand: 'Notebook', mic: 'Mic',
  homeTitle: 'Capture and review', notesTitle: 'Notes', docsTitle: 'Documents', searchTitle: 'Search', settingsTitle: 'Settings',
  recentPages: 'Recent pages', allNotes: 'All notes', textDocuments: 'Text documents', searchPlaceholder: 'Search pages and notes',
  yourNotebook: 'Your notebook', captureHint: 'Capture fragments as you think.', startHint: 'Start with a page or a quick note.',
  newNotebook: '+ Notebook', newPage: '+ New page', quickNote: 'Quick note', meetingMinutes: 'Meeting minutes',
  pages: 'Pages', noPages: 'No pages', noPagesYet: 'No pages yet. Create one to begin.', untitledPage: 'Untitled page',
  pageTitle: 'PAGE TITLE', participants: 'PARTICIPANTS', participantsPlaceholder: 'Names, separated by commas', agenda: 'AGENDA', classification: 'Classification',
  capturePlaceholder: 'Capture a thought, action, decision, or question...', saveFragment: 'Save fragment', dictate: 'Dictate',
  emptyFragments: 'Your saved fragments will appear here.', delete: 'Delete', deleteNote: 'Delete note', deletePage: 'Delete page',
  note: 'note', notes: 'notes', page: 'page', savedNote: 'saved note', savedNotes: 'saved notes',
  noNotes: 'No pages or notes yet.', filename: 'FILENAME', saveDocument: 'Save document', export: 'Export',
  chooseDocument: 'Choose or create a document.', noDocuments: 'No documents yet.', upload: 'Upload', newDocument: '+ New document',
  saveDocumentsHint: 'Save documents to your device before closing this tab.', searchNotebook: 'Search your notebook',
  resultsFor: 'Results for', noMatches: 'No matches.', settingsData: 'Settings and data',
  storageHint: 'Local-first storage is active. Changes are queued for synchronization when a server provider is configured.',
  language: 'Language', english: 'English', chinese: '简体中文', exportNotebook: 'Export notebook', deleteAll: 'Delete all local data',
  pageResult: 'Page', noteType: 'note', actionType: 'action', decisionType: 'decision', questionType: 'question',
  pendingSync: 'pending sync', offlineSaved: 'Offline - changes saved locally', notebookName: 'Notebook name',
  confirmDeleteNote: 'Delete this note?', confirmDeletePage: 'Delete this page and all its notes?',
  confirmDeleteAll: 'Delete all local notebook data?', localDataDeleted: 'Local data deleted', savedLocally: 'Saved locally',
  downloadStarted: 'Download started', savedToDevice: 'Saved to device', saveFailed: 'Could not save document',
  dictateUnavailable: 'Dictation is unavailable. You can type your note instead.', dictateFailed: 'Dictation failed. Typed capture remains available.',
  listening: 'Listening', onlineReady: 'Online - pending changes ready to sync', storageUnavailable: 'This browser does not support local storage.',
} as const;

export type TranslationKey = keyof typeof en;

const zh: Record<TranslationKey, string> = {
  brand: '笔记本', mic: '语音',
  homeTitle: '记录与回顾', notesTitle: '笔记', docsTitle: '文档', searchTitle: '搜索', settingsTitle: '设置',
  recentPages: '最近页面', allNotes: '所有笔记', textDocuments: '文本文档', searchPlaceholder: '搜索页面和笔记',
  yourNotebook: '我的笔记本', captureHint: '随时记录想法。', startHint: '创建页面或快速笔记。',
  newNotebook: '+ 笔记本', newPage: '+ 新建页面', quickNote: '快速笔记', meetingMinutes: '会议纪要',
  pages: '页面', noPages: '暂无页面', noPagesYet: '暂无页面，请先创建一个。', untitledPage: '未命名页面',
  pageTitle: '页面标题', participants: '参会人员', participantsPlaceholder: '用逗号分隔姓名', agenda: '议程', classification: '分类',
  capturePlaceholder: '记录想法、待办、决定或问题...', saveFragment: '保存笔记', dictate: '语音输入',
  emptyFragments: '保存的笔记会显示在这里。', delete: '删除', deleteNote: '删除笔记', deletePage: '删除页面',
  note: '条笔记', notes: '条笔记', page: '个页面', savedNote: '条已保存笔记', savedNotes: '条已保存笔记',
  noNotes: '暂无页面或笔记。', filename: '文件名', saveDocument: '保存文档', export: '导出',
  chooseDocument: '选择或创建文档。', noDocuments: '暂无文档。', upload: '上传', newDocument: '+ 新建文档',
  saveDocumentsHint: '关闭此标签页前，请将文档保存到设备。', searchNotebook: '搜索笔记本',
  resultsFor: '搜索结果：', noMatches: '没有匹配结果。', settingsData: '设置与数据',
  storageHint: '本地存储已启用。配置服务器后，更改会排队等待同步。',
  language: '界面语言', english: 'English', chinese: '简体中文', exportNotebook: '导出笔记本', deleteAll: '删除所有本地数据',
  pageResult: '页面', noteType: '笔记', actionType: '待办', decisionType: '决定', questionType: '问题',
  pendingSync: '项待同步', offlineSaved: '离线 - 更改已保存在本地', notebookName: '笔记本名称',
  confirmDeleteNote: '删除这条笔记？', confirmDeletePage: '删除此页面及其中所有笔记？',
  confirmDeleteAll: '删除所有本地笔记本数据？', localDataDeleted: '本地数据已删除', savedLocally: '已保存在本地',
  downloadStarted: '已开始下载', savedToDevice: '已保存到设备', saveFailed: '无法保存文档',
  dictateUnavailable: '无法使用语音输入，请改为输入文字。', dictateFailed: '语音输入失败，已输入的文字仍然保留。',
  listening: '正在聆听', onlineReady: '已联网 - 待同步更改已准备就绪', storageUnavailable: '此浏览器不支持本地存储。',
};

export function t(language: Language, key: TranslationKey): string {
  return language === 'zh' ? zh[key] : en[key];
}

export function pageTitle(page: Page, language: Language): string {
  if (page.template === 'general' && (page.title === 'Untitled page' || page.title === zh.untitledPage)) return t(language, 'untitledPage');
  if (page.template === 'meeting' && (page.title === 'Meeting minutes' || page.title === zh.meetingMinutes)) return t(language, 'meetingMinutes');
  return page.title || t(language, 'untitledPage');
}

export function classificationLabel(language: Language, classification: Classification): string {
  const keys = { note: 'noteType', action: 'actionType', decision: 'decisionType', question: 'questionType' } as const;
  return t(language, keys[classification]);
}

export function formatDate(value: string, language: Language, includeTime = false): string {
  const date = new Date(value);
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  return includeTime ? date.toLocaleString(locale) : date.toLocaleDateString(locale);
}
