import { get, set, del } from 'idb-keyval';
import { Notebook, Page } from '../types';

const NOTEBOOKS_KEY = 'freenotes_notebooks_list';
const NOTEBOOK_PREFIX = 'freenotes_notebook_';

export function createNewPage(template: Page['template'] = 'ruled', color: Page['color'] = 'white'): Page {
  return {
    id: 'page_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    template,
    color,
    strokes: [],
    texts: [],
    tapes: [],
    images: []
  };
}

export function createDefaultNotebook(title = 'Welcome to FreeNotes'): Notebook {
  return {
    id: 'nb_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    title,
    coverColor: '#3b82f6',
    coverPattern: 'minimal',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: ['General', 'Welcome'],
    pages: [
      {
        id: 'page_1_welcome',
        template: 'ruled',
        color: 'white',
        strokes: [],
        texts: [
          {
            id: 'txt_welcome_1',
            x: 80,
            y: 90,
            text: '✨ Welcome to FreeNotes Web!',
            fontSize: 32,
            color: '#1e293b'
          },
          {
            id: 'txt_welcome_2',
            x: 80,
            y: 160,
            text: 'Here all premium digital note-taking features are completely free:\n\n• Realistic Pens: Fountain, Ballpoint, Brush, and Highlighter\n• Unlimited Notebooks & Pages with multi-template support\n• Study Tape Tool (hide/reveal memorization cards)\n• Shape auto-tools, Lasso, and Text editing\n• High-resolution PDF import and multi-page export',
            fontSize: 18,
            color: '#475569'
          }
        ],
        tapes: [
          {
            id: 'tape_demo_1',
            x: 80,
            y: 360,
            width: 320,
            height: 38,
            color: '#f59e0b',
            isRevealed: false
          }
        ],
        images: []
      }
    ]
  };
}

export async function getNotebookList(): Promise<Notebook[]> {
  try {
    const list = await get<string[]>(NOTEBOOKS_KEY);
    if (!list || list.length === 0) {
      const defaultNb = createDefaultNotebook();
      await saveNotebook(defaultNb);
      return [defaultNb];
    }

    const notebooks: Notebook[] = [];
    for (const id of list) {
      const nb = await get<Notebook>(NOTEBOOK_PREFIX + id);
      if (nb) notebooks.push(nb);
    }
    return notebooks.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.error('Failed to load notebooks from IndexedDB, falling back to localStorage', err);
    const local = localStorage.getItem(NOTEBOOKS_KEY);
    if (local) {
      return JSON.parse(local);
    }
    const defaultNb = createDefaultNotebook();
    localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify([defaultNb]));
    return [defaultNb];
  }
}

export async function saveNotebook(notebook: Notebook): Promise<void> {
  try {
    notebook.updatedAt = Date.now();
    await set(NOTEBOOK_PREFIX + notebook.id, notebook);

    const list = (await get<string[]>(NOTEBOOKS_KEY)) || [];
    if (!list.includes(notebook.id)) {
      list.push(notebook.id);
      await set(NOTEBOOKS_KEY, list);
    }
  } catch (err) {
    console.error('Failed to save notebook to IndexedDB, fallback to localStorage', err);
    localStorage.setItem(NOTEBOOK_PREFIX + notebook.id, JSON.stringify(notebook));
  }
}

export async function deleteNotebook(id: string): Promise<void> {
  try {
    await del(NOTEBOOK_PREFIX + id);
    const list = (await get<string[]>(NOTEBOOKS_KEY)) || [];
    const filtered = list.filter((item) => item !== id);
    await set(NOTEBOOKS_KEY, filtered);
  } catch (err) {
    console.error('Failed to delete notebook from IndexedDB', err);
  }
}
