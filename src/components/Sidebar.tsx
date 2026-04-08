import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

// We listen to custom events from app.js to know what the current view is
export const Sidebar: React.FC = () => {
  const [viewState, setViewState] = useState({ view: 'bw2home', tab: 'resultados', branchId: null });
  const { activeEmpresaId, activeProyectoId } = useAppStore();

  useEffect(() => {
    const handleNavSync = (e: any) => {
      if (e.detail) {
        setViewState({
          view: e.detail.view || 'portfolio',
          tab: e.detail.activeTab || 'resultados',
          branchId: e.detail.activeBranchId || null
        });
      }
    };
    window.addEventListener('bw2:sync-state', handleNavSync);
    return () => window.removeEventListener('bw2:sync-state', handleNavSync);
  }, []);

  const dispatchNav = (action: string, payload: any = {}) => {
    window.dispatchEvent(new CustomEvent('bw2:react-nav', { detail: { action, ...payload } }));
  };

  const isHome = viewState.view === 'bw2home';
  const isEmpresaDash = viewState.view === 'empresa-dashboard';
  const isBranch = viewState.view === 'branch' && viewState.branchId;

  if (isHome) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', boxSizing: 'border-box' }}>
        <div className="nav-section">Mi Workspace</div>
        <button className="nav-btn active" onClick={() => dispatchNav('show-home')}>
          <span className="nav-icon">🏢</span><span className="nav-text">Mis Empresas</span>
        </button>
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <button className="btn-add" onClick={() => dispatchNav('create-empresa')}>
            <span className="nav-icon">+</span> <span className="nav-text">Nueva Empresa</span>
          </button>
        </div>
      </div>
    );
  }

  if (isEmpresaDash) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', boxSizing: 'border-box' }}>
        <button className="btn-sm" style={{ marginBottom: '1rem', alignSelf: 'flex-start', opacity: 0.8, background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => dispatchNav('show-home')}>
          ← Volver
        </button>
        <div className="nav-section">Portafolio</div>
        <button className="nav-btn active">
          <span className="nav-icon">📂</span><span className="nav-text">Proyectos</span>
        </button>
        <div style={{ marginTop: '1.5rem' }}>
          <button className="btn-add" onClick={() => dispatchNav('create-proyecto')}>
            <span className="nav-icon">+</span> <span className="nav-text">Nuevo Proyecto</span>
          </button>
        </div>
      </div>
    );
  }

  if (isBranch) {
    const isTab = (tab: string) => viewState.tab === tab ? ' active' : '';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', boxSizing: 'border-box' }}>
        <button className="btn-sm" style={{ marginBottom: '1rem', alignSelf: 'flex-start', opacity: 0.8, background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => dispatchNav('show-portfolio')}>
          ← Volver al Proyecto
        </button>
        <div className="nav-section">Análisis Operativo</div>
        <button className={`nav-btn${isTab('resultados')}`} onClick={() => dispatchNav('change-tab', { tab: 'resultados' })}>
          <span className="nav-icon">📈</span><span className="nav-text">Estado de Resultados</span>
        </button>
        <button className={`nav-btn${isTab('corrida')}`} onClick={() => dispatchNav('change-tab', { tab: 'corrida' })}>
          <span className="nav-icon">🗓️</span><span className="nav-text">Corrida Financiera</span>
        </button>
        <button className={`nav-btn${isTab('marketing')}`} onClick={() => dispatchNav('change-tab', { tab: 'marketing' })}>
          <span className="nav-icon">🚀</span><span className="nav-text">Growth & Marketing</span>
        </button>
        <button className={`nav-btn${isTab('config')}`} onClick={() => dispatchNav('change-tab', { tab: 'config' })}>
          <span className="nav-icon">⚙️</span><span className="nav-text">Configuración Capex</span>
        </button>
        <button className={`nav-btn${isTab('socioeconomico')}`} onClick={() => dispatchNav('change-tab', { tab: 'socioeconomico' })}>
          <span className="nav-icon">📍</span><span className="nav-text">Estudio de Mercado</span>
        </button>
        <div style={{ marginTop: '1.5rem' }}>
          <button className="btn-add" onClick={() => dispatchNav('export-pdf')} style={{ width: '100%', background: 'var(--surface)', color: 'var(--text-2)' }}>
            <span className="nav-icon">📄</span><span className="nav-text">Generar PDF</span>
          </button>
        </div>
      </div>
    );
  }

  // Level 3: Project Portfolio
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', boxSizing: 'border-box' }}>
      <button className="btn-sm" style={{ marginBottom: '1rem', alignSelf: 'flex-start', opacity: 0.8, background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => dispatchNav('show-empresa')}>
        ← Volver a Empresa
      </button>
      <div className="nav-section">Unidades de Negocio</div>
      <button className={`nav-btn${viewState.view === 'portfolio' ? ' active' : ''}`} onClick={() => dispatchNav('show-portfolio')}>
        <span className="nav-icon">🗺️</span><span className="nav-text">Sucursales</span>
      </button>
      <button className={`nav-btn${viewState.view === 'consolidated' ? ' active' : ''}`} onClick={() => dispatchNav('show-consolidated')}>
        <span className="nav-icon">📊</span><span className="nav-text">P&L Consolidado</span>
      </button>
      <div style={{ marginTop: '1.5rem', height: '1px', background: 'var(--border)', marginBottom: '1.5rem' }} />
      <div className="nav-section">Configuración de Proyecto</div>
      <button className={`nav-btn${viewState.view === 'sociedad' ? ' active' : ''}`} onClick={() => dispatchNav('show-sociedad')}>
        <span className="nav-icon">👥</span><span className="nav-text">Sociedad y Socios</span>
      </button>
      <button className="nav-btn" onClick={() => dispatchNav('export-excel')}>
        <span className="nav-icon">⬇️</span><span className="nav-text">Exportar Modelo Proscai</span>
      </button>
    </div>
  );
};
