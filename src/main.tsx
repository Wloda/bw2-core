import React from 'react';
import { createRoot } from 'react-dom/client';
import { useAppStore } from './store/useAppStore';

// Main entry point for the React application.
// We will incrementally map components here.

// Hydrate Zustand store if Vanilla JS made changes to localStorage
window.addEventListener('storage', (e) => {
  if (e.key === 'bw2_workspace') {
    useAppStore.persist.rehydrate();
  }
});

// A small test component to mount somewhere to prove React works
import { ProjectSettingsView } from './components/ProjectSettingsView';
import { PortfolioView } from './components/PortfolioView';

const ReactIntegration = () => {
  const [viewState, setViewState] = React.useState({ view: 'bw2home' });

  React.useEffect(() => {
    const handleNavSync = (e: any) => {
      if (e.detail) {
        setViewState({ view: e.detail.view });
      }
    };
    window.addEventListener('bw2:sync-state', handleNavSync);
    return () => window.removeEventListener('bw2:sync-state', handleNavSync);
  }, []);

  return (
    <>
      {viewState.view === 'empresa' && <ProjectSettingsView />}
      {viewState.view === 'portfolio' && <PortfolioView />}
    </>
  );
};

// Mount into the main-content container, alongside the vanilla sections
const mainContent = document.getElementById('main-content');
if (mainContent) {
  const reactContainer = document.createElement('div');
  reactContainer.id = 'react-view-container';
  mainContent.appendChild(reactContainer);
  const root = createRoot(reactContainer);
  root.render(<ReactIntegration />);
}
