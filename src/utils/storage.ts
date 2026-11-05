import { Notebook, Page } from '../types';

const DB_NAME = 'freenotes_db';
const DB_VERSION = 2;
const STORE_NAME = 'keyval_store';
const NOTEBOOKS_KEY = 'freenotes_notebooks_list';
const NOTEBOOK_PREFIX = 'freenotes_notebook_';

// In-memory cache of notebook IDs to avoid reading NOTEBOOKS_KEY on every stroke auto-save
let cachedNotebookIds: Set<string> | null = null;
let dbInstancePromise: Promise<IDBDatabase> | null = null;

/**
 * Cryptographically strong ID generator using crypto.randomUUID()
 */
export function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${performance.now().toString(36).replace('.', '')}`;
}

/**
 * Versioned IndexedDB connection with explicit schema upgrade handling
 */
function openVersionedDB(): Promise<IDBDatabase> {
  if (dbInstancePromise) return dbInstancePromise;

  dbInstancePromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbInstancePromise = null;
      reject(request.error);
    };
  });

  return dbInstancePromise;
}

export async function dbGet<T>(key: IDBValidKey): Promise<T | undefined> {
  const db = await openVersionedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function dbSet<T>(key: IDBValidKey, value: T): Promise<void> {
  const db = await openVersionedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbDel(key: IDBValidKey): Promise<void> {
  const db = await openVersionedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Safe localStorage setter with QuotaExceededError handling
 */
function safeLocalStorageSet(key: string, value: string, fallbackNotebook?: Notebook): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    const isQuotaError =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014);

    if (isQuotaError && fallbackNotebook) {
      try {
        // Strip heavy inline base64 images/PDF backgrounds if localStorage 5MB quota is exceeded
        const lightweightCopy: Notebook = {
          ...fallbackNotebook,
          pages: fallbackNotebook.pages.map((p) => ({
            ...p,
            pdfBackground: undefined,
            images: [],
          })),
        };
        localStorage.setItem(key, JSON.stringify(lightweightCopy));
        return true;
      } catch (_) {
        return false;
      }
    }
    return false;
  }
}

export function createNewPage(
  template: Page['template'] = 'ruled',
  color: Page['color'] = 'white'
): Page {
  return {
    id: generateId('page'),
    template,
    color,
    strokes: [],
    texts: [],
    tapes: [],
    images: [],
  };
}

export function createDefaultNotebook(title = 'Welcome to FreeNotes'): Notebook {
  const now = Date.now();
  return {
    id: generateId('nb'),
    title,
    coverColor: '#2563eb',
    coverPattern: 'minimal',
    createdAt: now,
    updatedAt: now,
    tags: ['Study', 'Welcome'],
    pages: [
      {
        id: generateId('page_welcome'),
        template: 'ruled',
        color: 'white',
        strokes: [],
        texts: [
          {
            id: generateId('txt_welcome'),
            x: 28,
            y: 48,
            text: 'Welcome to FreeNotes Web!',
            fontSize: 26,
            color: '#1e293b',
            width: 260,
          },
          {
            id: generateId('txt_welcome_body'),
            x: 28,
            y: 112,
            text: 'All digital note-taking features are free:\n• Pressure-sensitive Fountain, Ballpoint & Brush pens\n• Multi-template pages & Bookmarks\n• Study Tape Tool for active recall\n• Shape auto-snap, Lasso & OCR\n• Ultra-HD PDF import & export',
            fontSize: 16,
            color: '#475569',
            width: 260,
          },
        ],
        tapes: [
          {
            id: generateId('tape_demo'),
            x: 28,
            y: 288,
            width: 240,
            height: 36,
            color: '#f59e0b',
            isRevealed: false,
          },
        ],
        images: [],
      },
    ],
  };
}

function getNotebooksFromLocalStorageFallback(): Notebook[] {
  try {
    const rawList = localStorage.getItem(NOTEBOOKS_KEY);
    if (!rawList) return [];

    const parsed = JSON.parse(rawList);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    // Support both ID list ['nb_1', 'nb_2'] and legacy full Notebook[] array
    if (typeof parsed[0] === 'string') {
      const notebooks: Notebook[] = [];
      for (const id of parsed as string[]) {
        const rawNb = localStorage.getItem(NOTEBOOK_PREFIX + id);
        if (rawNb) {
          try {
            notebooks.push(JSON.parse(rawNb));
          } catch (_) {}
        }
      }
      return notebooks.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    return (parsed as Notebook[]).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (_) {
    return [];
  }
}

export async function getNotebookList(): Promise<Notebook[]> {
  try {
    const list = await dbGet<string[]>(NOTEBOOKS_KEY);
    if (!list || list.length === 0) {
      // Check if localStorage has fallback notebooks before creating default
      const fallbackNbs = getNotebooksFromLocalStorageFallback();
      if (fallbackNbs.length > 0) {
        cachedNotebookIds = new Set(fallbackNbs.map((n) => n.id));
        return fallbackNbs;
      }

      const defaultNb = createDefaultNotebook();
      await saveNotebook(defaultNb);
      return [defaultNb];
    }

    cachedNotebookIds = new Set(list);

    // Parallel loading with Promise.all instead of sequential loop
    const loaded = await Promise.all(
      list.map((id) => dbGet<Notebook>(NOTEBOOK_PREFIX + id))
    );

    const notebooks = loaded.filter((nb): nb is Notebook => Boolean(nb));
    if (notebooks.length === 0) {
      const defaultNb = createDefaultNotebook();
      await saveNotebook(defaultNb);
      return [defaultNb];
    }

    return notebooks.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (_) {
    const fallbackNbs = getNotebooksFromLocalStorageFallback();
    if (fallbackNbs.length > 0) {
      cachedNotebookIds = new Set(fallbackNbs.map((n) => n.id));
      return fallbackNbs;
    }

    const defaultNb = createDefaultNotebook();
    cachedNotebookIds = new Set([defaultNb.id]);
    safeLocalStorageSet(NOTEBOOKS_KEY, JSON.stringify([defaultNb.id]));
    safeLocalStorageSet(NOTEBOOK_PREFIX + defaultNb.id, JSON.stringify(defaultNb), defaultNb);
    return [defaultNb];
  }
}

export async function saveNotebook(notebook: Notebook): Promise<Notebook> {
  // Immutable copy: never mutate the caller's object directly
  const record: Notebook = {
    ...notebook,
    updatedAt: Date.now(),
  };

  try {
    await dbSet(NOTEBOOK_PREFIX + record.id, record);

    // Only read/write NOTEBOOKS_KEY if this notebook ID is not yet in our cached ID set
    if (!cachedNotebookIds) {
      const existingList = (await dbGet<string[]>(NOTEBOOKS_KEY)) || [];
      cachedNotebookIds = new Set(existingList);
    }

    if (!cachedNotebookIds.has(record.id)) {
      cachedNotebookIds.add(record.id);
      await dbSet(NOTEBOOKS_KEY, Array.from(cachedNotebookIds));
    }
  } catch (_) {
    // Consistent localStorage fallback: update both the notebook record and the ID list
    safeLocalStorageSet(NOTEBOOK_PREFIX + record.id, JSON.stringify(record), record);
    try {
      const rawList = localStorage.getItem(NOTEBOOKS_KEY);
      let idList: string[] = [];
      if (rawList) {
        const parsed = JSON.parse(rawList);
        if (Array.isArray(parsed)) {
          idList = parsed.map((item) => (typeof item === 'string' ? item : item.id)).filter(Boolean);
        }
      }
      if (!idList.includes(record.id)) {
        idList.push(record.id);
        safeLocalStorageSet(NOTEBOOKS_KEY, JSON.stringify(idList));
      }
      if (cachedNotebookIds) {
        cachedNotebookIds.add(record.id);
      }
    } catch (_) {}
  }

  return record;
}

export async function deleteNotebook(id: string): Promise<void> {
  if (cachedNotebookIds) {
    cachedNotebookIds.delete(id);
  }

  // Always clean up localStorage fallback keys as well
  try {
    localStorage.removeItem(NOTEBOOK_PREFIX + id);
    const rawList = localStorage.getItem(NOTEBOOKS_KEY);
    if (rawList) {
      const parsed = JSON.parse(rawList);
      if (Array.isArray(parsed)) {
        const filtered = parsed
          .map((item) => (typeof item === 'string' ? item : item.id))
          .filter((itemId) => Boolean(itemId) && itemId !== id);
        safeLocalStorageSet(NOTEBOOKS_KEY, JSON.stringify(filtered));
      }
    }
  } catch (_) {}

  try {
    await dbDel(NOTEBOOK_PREFIX + id);
    const list = cachedNotebookIds
      ? Array.from(cachedNotebookIds)
      : ((await dbGet<string[]>(NOTEBOOKS_KEY)) || []).filter((item) => item !== id);
    cachedNotebookIds = new Set(list);
    await dbSet(NOTEBOOKS_KEY, list);
  } catch (_) {}
}
