import { AppState } from './domain.js';

const DATABASE_NAME = 'notebook-mvp';
const STORE_NAME = 'state';

export class LocalStateStore {
  private database?: IDBDatabase;

  async open(): Promise<void> {
    this.database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
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

  private requireDatabase(): IDBDatabase {
    if (!this.database) throw new Error('Local state store has not been opened.');
    return this.database;
  }
}
