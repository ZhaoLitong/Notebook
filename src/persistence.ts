import { AppState, Revision } from './domain.js';

const DATABASE_NAME = 'notebook-mvp';
const STORE_NAME = 'state';
const REVISION_STORE = 'revisions';

export class LocalStateStore {
  private database?: IDBDatabase;

  async open(): Promise<void> {
    this.database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
        if (!request.result.objectStoreNames.contains(REVISION_STORE)) {
          request.result.createObjectStore(REVISION_STORE, { keyPath: 'id' }).createIndex('resource', 'resource');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async load(): Promise<Partial<AppState> | undefined> {
    const database = this.requireDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).get('state');
      request.onsuccess = () => resolve(request.result as Partial<AppState> | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  save(state: AppState): void {
    this.requireDatabase().transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(state, 'state');
  }

  async revisions(resource: string): Promise<Revision[]> {
    const request = this.requireDatabase().transaction(REVISION_STORE).objectStore(REVISION_STORE).index('resource').getAll(resource);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as Revision[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      request.onerror = () => reject(request.error);
    });
  }

  async addRevision(revision: Revision): Promise<void> {
    const existing = await this.revisions(revision.resource);
    if (existing.length && JSON.stringify(existing[0].snapshot) === JSON.stringify(revision.snapshot)) return;
    return new Promise((resolve, reject) => {
      const transaction = this.requireDatabase().transaction(REVISION_STORE, 'readwrite');
      const objectStore = transaction.objectStore(REVISION_STORE);
      objectStore.put(revision);
      for (const old of existing.slice(99)) objectStore.delete(old.id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteRevisions(prefix: string): Promise<void> {
    const transaction = this.requireDatabase().transaction(REVISION_STORE, 'readwrite');
    const store = transaction.objectStore(REVISION_STORE);
    const request = store.openCursor();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          if ((cursor.value as Revision).resource.startsWith(prefix)) cursor.delete();
          cursor.continue();
        }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async loadNoteDirectory(): Promise<FileSystemDirectoryHandle | undefined> {
    return new Promise((resolve, reject) => {
      const request = this.requireDatabase().transaction(STORE_NAME).objectStore(STORE_NAME).get('note-directory');
      request.onsuccess = () => resolve(request.result as FileSystemDirectoryHandle | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async saveNoteDirectory(handle?: FileSystemDirectoryHandle): Promise<void> {
    return new Promise((resolve, reject) => {
      const objectStore = this.requireDatabase().transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
      const request = handle ? objectStore.put(handle, 'note-directory') : objectStore.delete('note-directory');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private requireDatabase(): IDBDatabase {
    if (!this.database) throw new Error('Local state store has not been opened.');
    return this.database;
  }
}
