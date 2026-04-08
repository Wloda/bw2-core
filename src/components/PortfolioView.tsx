import React, { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { runBranchProjection } from '../engine/enterprise-engine';
import { MODELS } from '../engine/model-registry';

// Helper formatters
const fm = (v: number) => '$' + Math.round(v || 0).toLocaleString();
const fiva = (v: number) => '$' + Math.round((v || 0) * 1.16).toLocaleString();

// Helper to determine Out Of Pocket (OOP) / Tope Máximo
const getOOP = (r: any) => {
  if (!r) return 0;
  return (r.totalInvestment * 1.16) + (r.workingCapitalRequired || 0);
};

export const PortfolioView: React.FC = () => {
  const { activeEmpresaId, activeProyectoId, empresas } = useAppStore();

  const activeEmpresa = useMemo(() => 
    empresas.find(e => e.id === activeEmpresaId), 
    [empresas, activeEmpresaId]
  );
  
  const activeProj = useMemo(() => 
    activeEmpresa?.proyectos?.find(p => p.id === activeProyectoId), 
    [activeEmpresa, activeProyectoId]
  );

  if (!activeEmpresa || !activeProj) return null;

  // Compute Portfolio metrics
  let totalComm = 0;
  let totalEBITDA = 0;
  let totalScore = 0;
  let scoredCount = 0;
  const activeBranches = (activeProj.branches || []).filter(b => (b.status as any) !== 'archived');
  
  const branchResults = activeProj.branches.map(b => {
    try {
      const r = runBranchProjection(b, activeProj, activeEmpresa);
      if ((b.status as any) !== 'archived' && r) {
        totalComm += getOOP(r);
        totalEBITDA += r.avgMonthlyEBITDA || 0;
        if (r.viabilityScore) { totalScore += r.viabilityScore; scoredCount++; }
      }
      return { branch: b, result: r };
    } catch (e) {
      return { branch: b, result: null };
    }
  });

  const avgScore = scoredCount ? Math.round(totalScore / scoredCount) : 0;
  // Pseudoconsolidation for Libre / Faltante
  const totalFree = (activeProj.totalCapital || 0) - totalComm;

  const scoreRing = (score: number, size: number = 40) => {
    const r = (size / 2) - 3;
    const c = size / 2;
    const dash = 2 * Math.PI * r;
    const offset = dash - (score / 100) * dash;
    const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--yellow)' : 'var(--red)';
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="4"
                strokeDasharray={dash} strokeDashoffset={offset} strokeLinecap="round" />
        <text x="50%" y="50%" fill="var(--text-1)" fontSize={size * 0.3}
              fontWeight="600" dominantBaseline="middle" textAnchor="middle" style={{ transform: 'rotate(90deg) translate(0px, -2px)', transformOrigin: 'center' }}>
          {score}
        </text>
      </svg>
    );
  };

  return (
    <>
      <section id="view-portfolio-react" className="dashboard-section" style={{ display: 'block' }}>
        
        {/* Global Summary Card Container */}
        <div id="portfolio-summary-react" style={{ marginBottom: '1.5rem' }}>
          <div className="global-summary-title">📁 {activeProj.name} — Resumen (React)</div>
          <div className="global-summary-grid">
            <div className="global-summary-card">
              <span className="global-summary-label">Capital Total</span>
              <span className="global-summary-value">{fm(activeProj.totalCapital || 0)}</span>
            </div>
            <div className="global-summary-card">
              <span className="global-summary-label">Tope Máx. Requerido</span>
              <span className="global-summary-value" style={{ color: 'var(--yellow)' }}>{fm(totalComm)}</span>
              <span className="global-summary-sub">
                {activeProj.totalCapital ? ((totalComm / activeProj.totalCapital) * 100).toFixed(0) : '0'}%
              </span>
            </div>
            <div className="global-summary-card">
              <span className="global-summary-label">Libre / Faltante</span>
              <span className="global-summary-value" style={{ color: totalFree >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {fm(totalFree)}
              </span>
            </div>
            <div className="global-summary-card">
              <span className="global-summary-label">Ganancia/mes</span>
              <span className="global-summary-value" style={{ color: totalEBITDA >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {fm(totalEBITDA)}
              </span>
            </div>
            <div className="global-summary-card">
              <span className="global-summary-label">Sucursales</span>
              <span className="global-summary-value">{activeBranches.length}</span>
            </div>
            <div className="global-summary-card">
              <span className="global-summary-label">Score Promedio</span>
              <span className="global-summary-value" style={{ marginTop: '0.25rem' }}>{scoreRing(avgScore, 40)}</span>
            </div>
          </div>
        </div>

        {/* Portfolio Branches List */}
        <div className="portfolio-header">
          <h2 id="portfolio-title-react">Sucursales de {activeProj.name}</h2>
          <div className="portfolio-actions">
            <button className="btn-secondary" disabled>📊 Descargar Reporte (Pronto)</button>
            <button className="btn-primary" disabled>+ Nueva Sucursal</button>
          </div>
        </div>

        <div id="portfolio-grid-react" className="branch-grid">
          {branchResults.map(({ branch: b, result: r }) => {
            const score = r ? r.viabilityScore : 0;
            const emoji = MODELS[b.format]?.emoji || '📍';
            const isArchived = (b.status as any) === 'archived' || (b.status as any) === 'paused';
            const isActive = (b.status as any) === 'active';
            
            return (
              <div key={b.id} className={`branch-card ${isArchived ? 'archived' : ''}`}>
                <div className="branch-card-header">
                  <span className="branch-emoji">{emoji}</span>
                  <div className="branch-info">
                    <div className="branch-name">{b.name}</div>
                    <div className="branch-meta">{MODELS[b.format]?.label || b.format} · {b.colonia || 'Sin colonia'}</div>
                  </div>
                  <div className="branch-header-actions">
                    <span className={`branch-status ${isArchived ? 'archived' : (b.status === 'planned' ? 'planned' : 'active')}`}>
                       {b.status === 'planned' ? 'Planeada' : (isActive ? 'Activa' : 'Archivada')}
                    </span>
                  </div>
                </div>
                
                {r ? (
                  <div className="branch-kpis">
                    <div className="branch-kpi">
                      <span className="bk-label" title="Ganancia mensual antes de impuestos">Ganancia/mes</span>
                      <span className="bk-value" style={{ color: r.avgMonthlyEBITDA >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {fm(r.avgMonthlyEBITDA)}
                      </span>
                    </div>
                    <div className="branch-kpi">
                      <span className="bk-label" title="Venta mínima mensual para cubrir todos los costos">Pto. Equilibrio</span>
                      <span className="bk-value">{fm(r.breakEvenRevenue)}</span>
                    </div>
                    <div className="branch-kpi">
                      <span className="bk-label" title="Meses para recuperar inversión">Recuperación</span>
                      <span className="bk-value" style={{ color: r.paybackMonth && r.paybackMonth <= 36 ? 'var(--green)' : 'var(--yellow)' }}>
                        {r.paybackMonth ? r.paybackMonth + ' meses' : '∞'}
                      </span>
                    </div>
                    <div className="branch-kpi" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span className="bk-label" title="Calificación de viabilidad">Calif.</span>
                      {scoreRing(score, 32)}
                    </div>
                  </div>
                ) : (
                  <div className="branch-kpis"><span style={{ color: 'var(--text-3)' }}>Sin datos</span></div>
                )}
                
                <div className="branch-actions">
                  <button className="btn-sm" disabled>👁 Ver Detalle</button>
                  <button className="btn-sm" disabled>✏️ Renombrar</button>
                  {!isArchived && <button className="btn-sm warn" disabled>🗑 Archivar</button>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
};
