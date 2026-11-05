import React, { useState, useEffect } from 'react';
import { Notebook } from './types';
import { getNotebookList } from './utils/storage';
import { ShelfView } from './components/ShelfView';
import { NotebookEditor } from './components/NotebookEditor';

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
      <NotebookEditor
        initialNotebook={activeNotebook}
        onBackToShelf={() => {
          setActiveNotebook(null);
          loadNotebooks();
        }}
      />
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
