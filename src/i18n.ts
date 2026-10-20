import type { Classification, Language, Page } from './domain.js';

const en = {
  brand: 'Notebook', mic: 'Mic',
  cancel: 'Cancel', continueAction: 'Continue', createNotebook: 'Create notebook', deleteAction: 'Delete',
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
  edit: 'Edit', split: 'Split', preview: 'Preview', documentView: 'Document view', emptyPreview: 'Nothing to preview yet.',
  dropDocument: 'Drop a Markdown or text file here to open it', openDocument: 'Open file', storedDocuments: 'Previously stored documents',
  unsavedDocument: 'This document has changes not saved to a device file. Leave the editor? The local copy and history will remain in this browser.', invalidDocument: 'Open a .md or .txt file.',
  saveDocumentsHint: 'Save documents to your device before closing this tab.', searchNotebook: 'Search your notebook',
  resultsFor: 'Results for', noMatches: 'No matches.', settingsData: 'Settings and data',
  storageHint: 'Local-first storage is active. Changes are queued for synchronization when a server provider is configured.',
  language: 'Language', english: 'English', chinese: '简体中文', exportNotebook: 'Export notebook', deleteAll: 'Delete all local data',
  noteDirectory: 'Note save folder', noNoteDirectory: 'No folder selected. Notes are saved in this browser only.',
  history: 'Change history', closeHistory: 'Close', noHistory: 'No earlier versions yet.', restoreVersion: 'Restore this version', restoredVersion: 'Version restored', historyFailed: 'Could not save change history',
  directoryUnsupported: 'Folder saving requires desktop Chrome or Edge on localhost or HTTPS.',
  chooseDirectory: 'Choose folder', changeDirectory: 'Change folder', disconnectDirectory: 'Disconnect folder',
  directorySaveFailed: 'Note saved in browser, but could not write the file.', directorySelected: 'Note folder selected',
  localData: 'Local data', notebookData: 'Notebook content', documentData: 'Text documents', syncData: 'Sync records',
  preferenceData: 'Preferences', draft: 'draft', drafts: 'drafts', notebook: 'notebook', notebooks: 'notebooks',
  document: 'document', documents: 'documents', syncEvent: 'sync record', syncEvents: 'sync records',
  deleteSelected: 'Delete selected', chooseData: 'Choose what to delete.', deviceFilesUnaffected: 'Files saved to your device are not affected.',
  confirmDeleteSelected: 'Delete the selected local data?', confirmDeleteAllData: 'Delete all local data?',
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
  cancel: '取消', continueAction: '继续', createNotebook: '创建笔记本', deleteAction: '删除',
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
  edit: '编辑', split: '分栏', preview: '预览', documentView: '文档视图', emptyPreview: '暂无可预览内容。',
  dropDocument: '将 Markdown 或文本文档拖到此处打开', openDocument: '打开文件', storedDocuments: '之前存储的文档',
  unsavedDocument: '当前文档有尚未保存到设备文件的修改。离开编辑器吗？本地副本和历史记录会保留在此浏览器中。', invalidDocument: '请打开 .md 或 .txt 文件。',
  saveDocumentsHint: '关闭此标签页前，请将文档保存到设备。', searchNotebook: '搜索笔记本',
  resultsFor: '搜索结果：', noMatches: '没有匹配结果。', settingsData: '设置与数据',
  storageHint: '本地存储已启用。配置服务器后，更改会排队等待同步。',
  language: '界面语言', english: 'English', chinese: '简体中文', exportNotebook: '导出笔记本', deleteAll: '删除所有本地数据',
  noteDirectory: '笔记保存文件夹', noNoteDirectory: '尚未选择文件夹。笔记仅保存在此浏览器中。',
  history: '修改历史', closeHistory: '关闭', noHistory: '暂无历史版本。', restoreVersion: '恢复此版本', restoredVersion: '已恢复历史版本', historyFailed: '无法保存修改历史',
  directoryUnsupported: '保存到文件夹需要在 localhost 或 HTTPS 上使用桌面版 Chrome 或 Edge。',
  chooseDirectory: '选择文件夹', changeDirectory: '更换文件夹', disconnectDirectory: '断开文件夹',
  directorySaveFailed: '笔记已保存在浏览器中，但写入文件失败。', directorySelected: '已选择笔记文件夹',
  localData: '本地数据', notebookData: '笔记本内容', documentData: '文本文档', syncData: '同步记录',
  preferenceData: '偏好设置', draft: '份草稿', drafts: '份草稿', notebook: '个笔记本', notebooks: '个笔记本',
  document: '份文档', documents: '份文档', syncEvent: '条同步记录', syncEvents: '条同步记录',
  deleteSelected: '删除选中项', chooseData: '选择要删除的数据。', deviceFilesUnaffected: '已保存到设备的文件不会受到影响。',
  confirmDeleteSelected: '删除选中的本地数据？', confirmDeleteAllData: '删除所有本地数据？',
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
