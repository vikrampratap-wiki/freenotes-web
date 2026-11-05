import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Notebook } from './types';
import { getNotebookList } from './utils/storage';
import { ShelfView } from './components/ShelfView';

const NotebookEditor = lazy(() =>
  import('./components/NotebookEditor').then((mod) => ({ default: mod.NotebookEditor }))
);

export const App: React.FC = () => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const loadNotebooks = async () => {
    const list = await getNotebookList();
    setNotebooks(list);
  };

  useEffect(() => {
    loadNotebooks();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  if (activeNotebook) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 gap-3">
            <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-xs font-semibold">नोटबुक एडिटर लोड हो रहा है (Loading Workspace)...</p>
          </div>
        }
      >
        <NotebookEditor
          initialNotebook={activeNotebook}
          onBackToShelf={() => {
            setActiveNotebook(null);
            loadNotebooks();
          }}
        />
      </Suspense>
    );
  }

  return (
    <ShelfView
      notebooks={notebooks}
      onSelectNotebook={(nb) => setActiveNotebook(nb)}
      onRefreshNotebooks={loadNotebooks}
      isDarkMode={isDarkMode}
      onToggleDarkMode={toggleDarkMode}
    />
  );
};

export default App;
