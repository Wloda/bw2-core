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

let isSyncingFromVanilla = false;

// Watch React state changes and sync back to Vanilla JS
useAppStore.subscribe((state, prevState) => {
  if (!isSyncingFromVanilla && state.empresas !== prevState.empresas && (window as any).updateEmpresasFromReact) {
    (window as any).updateEmpresasFromReact(state.empresas);
  }
});

// A small test component to mount somewhere to prove React works
import { ProjectSettingsView } from './components/ProjectSettingsView';
import { PortfolioView } from './components/PortfolioView';
import { BW2HomeView } from './components/BW2HomeView';
import { EmpresaDashboardView } from './components/EmpresaDashboardView';

const ReactIntegration = () => {
  const [viewState, setViewState] = React.useState({ view: 'bw2home' });

  React.useEffect(() => {
    const handleNavSync = (e: any) => {
      if (e.detail) {
        // Hydrate Zustand with the legacy state from Vanilla so React Portfolio uses real data
        if (e.detail.empresas) {
          isSyncingFromVanilla = true;
          useAppStore.setState({ 
            empresas: e.detail.empresas,
            activeEmpresaId: e.detail.activeEmpresaId || null,
            activeProyectoId: e.detail.activeProyectoId || null
          });
          setTimeout(() => { isSyncingFromVanilla = false; }, 50);
        }
        setViewState({ view: e.detail.view });
      }
    };
    window.addEventListener('bw2:sync-state', handleNavSync);
    return () => window.removeEventListener('bw2:sync-state', handleNavSync);
  }, []);

  return (
    <>
      {viewState.view === 'bw2home' && <BW2HomeView />}
      {viewState.view === 'empresa-dashboard' && <EmpresaDashboardView />}
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
