import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { runConsolidation, runBranchProjection } from '../engine/enterprise-engine';

export const EmpresaDashboardView: React.FC = () => {
  const { empresas, activeEmpresaId, setActiveProyecto } = useAppStore();

  const activeEmp = empresas.find(e => e.id === activeEmpresaId);
  if (!activeEmp) return null;

  const handleOpenProyecto = (projId: string) => {
    setActiveProyecto(activeEmp.id, projId);
    const win = window as any;
    if (win.state && win.renderCurrentView) {
      win.state.activeLevel = 3;
      win.state.view = 'portfolio';
      win.renderCurrentView();
    }
  };

  const handleEditProyecto = (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if ((window as any).showBW2Modal) {
      (window as any).showBW2Modal('editar-proyecto', activeEmp.id, projId);
    }
  };

  const handleDeleteProyecto = (proj: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if ((window as any).showConfirm) {
      (window as any).showConfirm(
        `🗑️ ¿Eliminar "${proj.name}"?`,
        `<p>Se eliminarán todas las sucursales de este proyecto.</p>`,
        '🗑️ Eliminar',
        () => {
          if ((window as any).removeProyecto) {
            (window as any).removeProyecto(activeEmp.id, proj.id);
            if ((window as any).renderCurrentView) {
              (window as any).renderCurrentView();
            }
          }
        }
      );
    }
  };

  const handleCreateProyecto = () => {
    if ((window as any).WizardManager) {
      (window as any).WizardManager.open('proyecto', activeEmp.id);
    }
  };

  // Calculate empresa-wide KPIs across all projects
  let totalCap = activeEmp.totalCapital || 0;
  let totalComm = 0, totalBranches = 0, totalEBITDA = 0, totalScore = 0, scoredCount = 0;
  
  (activeEmp.proyectos || []).forEach(proj => {
    (proj.branches || []).forEach(b => {
      if(b.status === 'archived') return;
      totalBranches++;
      try {
        const r = runBranchProjection(b, activeEmp, activeEmp) as any;
        if(r) {
          totalComm += (r.totalInvestment * 1.16) + (r.workingCapitalRequired || 0);
          totalEBITDA += r.avgMonthlyEBITDA || 0;
          if(r.viabilityScore) { totalScore += r.viabilityScore; scoredCount++; }
        }
      } catch(e) {}
    });
  });

  const avgScore = scoredCount ? Math.round(totalScore/scoredCount) : 0;
  const totalFree = totalCap - totalComm;
  const fmtM = (v: number) => '$' + Math.round(v).toLocaleString();

  // Helper for rendering SVG score rings, similar to what vanilla JS had
  const scoreRing = (score: number, size = 40) => {
    const radius = (size / 2) - 3;
    const circ = 2 * Math.PI * radius;
    const strokeDasharray = `${(score / 100) * circ} ${circ}`;
    const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--yellow)' : 'var(--red)';
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--bg-3)" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="4" strokeDasharray={strokeDasharray} strokeLinecap="round" />
        <text x="50%" y="50%" fill="var(--text-1)" fontSize="11" fontWeight="700" textAnchor="middle" dy=".3em" transform={`rotate(90 ${size/2} ${size/2})`}>{score || '-'}</text>
      </svg>
    );
  };

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0.75rem', maxWidth: 'none', margin: '0' }}>
      
      {/* Title */}
      <div id="empresa-dash-title" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
        🏢 {activeEmp.name || 'Empresa'}
      </div>

      {/* Summary KPIs */}
      <div id="empresa-dash-summary" style={{ marginBottom: '2rem' }}>
        <div className="kpi-grid">
          <div className="kpi-card" data-status="neutral">
            <div className="kpi-label">Capital Total</div>
            <div className="kpi-value">{fmtM(totalCap)}</div>
          </div>
          <div className={`kpi-card ${totalComm > totalCap ? 'danger' : 'warn'}`}>
            <div className="kpi-label">Inv. Requerida</div>
            <div className="kpi-value" style={{ color: totalComm > totalCap ? 'var(--red)' : 'var(--yellow)' }}>{fmtM(totalComm)}</div>
            <div className="kpi-detail">{totalCap ? ((totalComm / totalCap) * 100).toFixed(0) : '0'}% del cap.</div>
          </div>
          <div className={`kpi-card ${totalFree >= 0 ? 'success' : 'danger'}`}>
            <div className="kpi-label">Libre / Faltante</div>
            <div className="kpi-value" style={{ color: totalFree >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtM(totalFree)}</div>
          </div>
          <div className="kpi-card" data-status="neutral">
            <div className="kpi-label">Sucursales</div>
            <div className="kpi-value">{totalBranches}</div>
            <div className="kpi-detail">{activeEmp.proyectos?.length || 0} proyecto{(activeEmp.proyectos?.length || 0) !== 1 ? 's' : ''}</div>
          </div>
          <div className={`kpi-card ${totalEBITDA >= 0 ? 'success' : 'danger'}`}>
            <div className="kpi-label">EBITDA/mes</div>
            <div className="kpi-value" style={{ color: totalEBITDA >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtM(totalEBITDA)}</div>
          </div>
          <div className={`kpi-card ${avgScore >= 70 ? 'success' : avgScore >= 50 ? 'warn' : 'danger'}`}>
            <div className="kpi-label">Score</div>
            <div className="kpi-value" style={{ display: 'flex', alignItems: 'center' }}>{scoreRing(avgScore, 40)}</div>
          </div>
        </div>
      </div>

      {/* Project Cards Grid */}
      <div id="empresa-dash-proyectos" className="empresa-dash-grid">
        {(activeEmp.proyectos || []).map(proj => {
          const activeBranches = (proj.branches || []).filter(b => b.status !== 'archived');
          let projEBITDA = 0, projScore = 0, projScored = 0, projPayback = 0;
          activeBranches.forEach(b => {
            try {
              const r = runBranchProjection(b, activeEmp, activeEmp) as any;
              if (r) {
                projEBITDA += r.avgMonthlyEBITDA || 0;
                if (r.paybackMonth > projPayback) projPayback = r.paybackMonth;
                if (r.viabilityScore) { projScore += r.viabilityScore; projScored++; }
              }
            } catch(e) {}
          });
          const pScore = projScored ? Math.round(projScore / projScored) : 0;
          const pScoreCol = pScore >= 80 ? 'var(--green)' : pScore >= 60 ? 'var(--yellow)' : 'var(--red)';

          const logoHtml = proj.logo
            ? `<img src="${proj.logo}" alt="" style="width:28px;height:28px;border-radius:6px;object-fit:cover" />`
            : '<span style="font-size:1.25rem">📁</span>';

          return (
            <div key={proj.id} className="emp-dash-proj-card">
              <div className="emp-dash-proj-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div dangerouslySetInnerHTML={{ __html: logoHtml }} />
                  <div>
                    <div className="emp-dash-proj-name">{proj.name}</div>
                    <div className="emp-dash-proj-meta">Capital: {fmtM((proj as any).totalCapital || 2000000)} · {activeBranches.length} sucursal{activeBranches.length !== 1 ? 'es' : ''}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button className="icon-btn btn-edit-proyecto" onClick={(e) => handleEditProyecto(proj.id, e)} title="Editar" style={{background:'transparent', border:'none', cursor:'pointer'}}>✏️</button>
                  <button className="icon-btn btn-delete-proyecto" onClick={(e) => handleDeleteProyecto(proj, e)} title="Eliminar" style={{background:'transparent', border:'none', cursor:'pointer'}}>🗑️</button>
                </div>
              </div>

              <div className="emp-dash-proj-kpis">
                <div className="emp-dash-kpi">
                  <span className="emp-dash-kpi-label">Ganancia/mes</span>
                  <span className="emp-dash-kpi-value" style={{ color: projEBITDA >= 0 ? 'var(--accent)' : 'var(--red)' }}>{fmtM(projEBITDA)}</span>
                </div>
                <div className="emp-dash-kpi">
                  <span className="emp-dash-kpi-label">Recuperación</span>
                  <span className="emp-dash-kpi-value">{projPayback ? projPayback + ' m' : '—'}</span>
                </div>
                <div className="emp-dash-kpi" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="emp-dash-kpi-label">Score</span>
                  {scoreRing(pScore, 36)}
                </div>
              </div>

              <div className="emp-dash-proj-footer">
                <div className="emp-dash-proj-meta-foot">{activeBranches.length} sucursal{activeBranches.length !== 1 ? 'es' : ''} activas</div>
                <button className="btn-open-proyecto-dash btn-compact-open" onClick={() => handleOpenProyecto(proj.id)} style={{ width: 'auto', marginTop: 0, display: 'inline-block' }}>Abrir →</button>
              </div>
            </div>
          );
        })}

        {/* Add Project Card */}
        <div className="emp-dash-proj-card emp-dash-add-card" onClick={handleCreateProyecto}>
          <button className="btn-add-proyecto-dash" style={{ pointerEvents: 'none' }}>+ Nuevo Proyecto</button>
        </div>
      </div>
    </div>
  );
};
