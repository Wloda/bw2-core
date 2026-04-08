import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { runConsolidation } from '../engine/enterprise-engine';

export const BW2HomeView: React.FC = () => {
  const { empresas, setActiveEmpresa } = useAppStore();

  const handleOpenEmpresa = (empId: string) => {
    setActiveEmpresa(empId);
    const win = window as any;
    if (win.state && win.renderCurrentView) {
      win.state.activeLevel = 2;
      win.state.view = 'empresa-dashboard';
      win.renderCurrentView();
    }
  };

  const handleEditEmpresa = (empId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Use legacy modal to edit name and logo safely
    if ((window as any).showBW2Modal) {
      (window as any).showBW2Modal('editar-empresa', empId);
    }
  };

  const handleDeleteEmpresa = (empresa: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if ((window as any).showConfirm) {
      (window as any).showConfirm(
        `🗑️ ¿Eliminar "${empresa.name}"?`,
        `<p>Se eliminarán todos los proyectos y sucursales.</p>`,
        '🗑️ Eliminar',
        () => {
          if ((window as any).removeEmpresa) {
            (window as any).removeEmpresa(empresa.id);
            // It will trigger bw2:sync-state to update React
          }
        }
      );
    }
  };

  const handleCreateEmpresa = () => {
    if ((window as any).WizardManager) {
      (window as any).WizardManager.open('empresa');
    }
  };

  // Calculate global metrics across all enterprises
  let gCap = 0, gComm = 0, gBranches = 0, gEBITDA = 0, gScore = 0, gScored = 0, gWorkingCapital = 0;
  
  const empresaSummaries = empresas.map(emp => {
    const allBranches = emp.proyectos?.flatMap(p => p.branches || []) || [];
    const pseudoProj = { branches: allBranches };
    const consol = runConsolidation(pseudoProj, emp);
    
    gCap += emp.totalCapital || 0;
    gComm += consol.capitalCommitted;
    gBranches += consol.branchCount;
    gEBITDA += consol.avgMonthlyEBITDA;
    // We get working capital roughly from committed - investment (simplified for home view as in legacy)
    const investment = consol.totalInvestment * 1.16; // VAT approximation
    gWorkingCapital += Math.max(0, consol.capitalCommitted - investment);

    if (consol.avgScore > 0) {
      gScore += consol.avgScore;
      gScored++;
    }

    return { emp, consol };
  });

  const gFree = gCap - gComm;
  const gAvg = gScored ? Math.round(gScore / gScored) : 0;
  const fmtM = (v: number) => '$' + Math.round(v).toLocaleString();

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0.75rem', maxWidth: 'none', margin: '0' }}>
      
      {/* KPI Global Strip */}
      <div className="bw2-global-summary" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-grid">
          <div className="kpi-card" data-status="neutral">
            <div className="kpi-label">Capital Total</div>
            <div className="kpi-value">{fmtM(gCap)}</div>
          </div>
          <div className={`kpi-card ${gComm > gCap ? 'danger' : 'warn'}`}>
            <div className="kpi-label">Tope Máx. Requerido</div>
            <div className="kpi-value" style={{ color: gComm > gCap ? 'var(--red)' : 'var(--yellow)' }}>{fmtM(gComm)}</div>
            <div className="kpi-detail">{gCap > 0 ? ((gComm / gCap) * 100).toFixed(0) : '0'}% de cap.</div>
          </div>
          <div className={`kpi-card ${gFree >= 0 ? 'success' : 'danger'}`}>
            <div className="kpi-label">Libre / Faltante</div>
            <div className="kpi-value" style={{ color: gFree >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtM(gFree)}</div>
          </div>
          <div className="kpi-card" data-status="neutral">
            <div className="kpi-label">Sucursales</div>
            <div className="kpi-value">{gBranches}</div>
            <div className="kpi-detail">{empresas.length} empresa{empresas.length !== 1 ? 's' : ''}</div>
          </div>
          <div className={`kpi-card ${gEBITDA >= 0 ? 'success' : 'danger'}`}>
            <div className="kpi-label">EBITDA/mes</div>
            <div className="kpi-value" style={{ color: gEBITDA >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtM(gEBITDA)}</div>
          </div>
          <div className={`kpi-card ${gAvg >= 80 ? 'success' : gAvg >= 60 ? 'warn' : 'danger'}`}>
            <div className="kpi-label">Score</div>
            <div className="kpi-value">{gAvg}/100</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-1)' }}>Tus Empresas</h2>
        <button className="btn-add" onClick={handleCreateEmpresa} style={{ width: 'auto', margin: 0, padding: '0.4rem 1rem' }}>
          + Nueva Empresa
        </button>
      </div>

      {/* Grid de Empresas */}
      <div className="empresa-dash-grid">
        {empresaSummaries.map(({ emp, consol }) => {
          const titleHtml = emp.logo
            ? `<img src="${emp.logo}" alt="" style="width:32px;height:32px;border-radius:6px;object-fit:cover">`
            : '<span style="font-size:1.5rem">🏢</span>';

          const payback = consol.paybackMonth || 0;

          return (
            <div key={emp.id} className="emp-dash-proj-card" style={{ cursor: 'pointer' }} onClick={() => handleOpenEmpresa(emp.id)}>
              <div className="emp-dash-proj-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div dangerouslySetInnerHTML={{ __html: titleHtml }} />
                  <div>
                    <div className="emp-dash-proj-name">{emp.name}</div>
                    <div className="emp-dash-proj-meta">{emp.proyectos?.length || 0} proyecto{(emp.proyectos?.length || 0) !== 1 ? 's' : ''} · {consol.branchCount} sucursal{consol.branchCount !== 1 ? 'es' : ''}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button className="icon-btn" onClick={(e) => handleEditEmpresa(emp.id, e)} title="Editar Logo/Nombre" style={{ background:'transparent', border:'none', cursor:'pointer' }}>✏️</button>
                  <button className="icon-btn" onClick={(e) => handleDeleteEmpresa(emp, e)} title="Eliminar" style={{ background:'transparent', border:'none', cursor:'pointer' }}>🗑️</button>
                </div>
              </div>
              <div className="emp-dash-proj-kpis">
                <div className="emp-dash-kpi">
                  <span className="emp-dash-kpi-label">EBITDA/mes</span>
                  <span className="emp-dash-kpi-value" style={{ color: consol.avgMonthlyEBITDA >= 0 ? 'var(--accent)' : 'var(--red)' }}>{fmtM(consol.avgMonthlyEBITDA)}</span>
                </div>
                <div className="emp-dash-kpi">
                  <span className="emp-dash-kpi-label">Recuperación</span>
                  <span className="emp-dash-kpi-value">{payback ? payback + ' m' : '—'}</span>
                </div>
                <div className="emp-dash-kpi">
                  <span className="emp-dash-kpi-label">Score</span>
                  <span className="emp-dash-kpi-value" style={{ color: consol.avgScore >= 80 ? 'var(--green)' : consol.avgScore >= 60 ? 'var(--yellow)' : 'var(--red)' }}>{consol.avgScore}/100</span>
                </div>
              </div>
              <div className="emp-dash-proj-footer">
                <div className="emp-dash-proj-meta-foot">{consol.branchCountActive} sucursal{consol.branchCountActive !== 1 ? 'es' : ''} activas</div>
                <button className="btn-open-proyecto-dash btn-compact-open" style={{ width: 'auto', marginTop: 0, display: 'inline-block' }}>Abrir →</button>
              </div>
            </div>
          );
        })}
        
        <div className="emp-dash-proj-card emp-dash-add-card" onClick={handleCreateEmpresa}>
          <button className="btn-add-proyecto-dash" style={{ pointerEvents: 'none' }}>+ Nueva Empresa</button>
        </div>
      </div>
    </div>
  );
};
