import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { runConsolidation } from '../engine/enterprise-engine';

export const ProjectSettingsView: React.FC = () => {
  const { empresas, activeEmpresaId, activeProyectoId, updateProyecto, addPartner, removePartner, updatePartner } = useAppStore();
  
  const activeEmp = empresas.find(e => e.id === activeEmpresaId);
  const activeProj = activeEmp?.proyectos.find(p => p.id === activeProyectoId);

  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerCapital, setNewPartnerCapital] = useState('');
  const [newPartnerEquity, setNewPartnerEquity] = useState('');

  if (!activeEmp || !activeProj) return null;

  // Run consolidation to get KPIs
  // Because runConsolidation was ported from JS, it natively accepts the project and activeEmp
  const consol = runConsolidation(activeProj, activeEmp);
  const capStatus = consol.capitalFree >= 0 ? 'good' : 'bad';
  
  const totalEquity = activeProj.partners.reduce((s, p) => s + p.equity, 0);
  const equityOk = Math.abs(totalEquity - 1) < 0.001;

  const handleAddPartner = () => {
    if (!newPartnerName) return;
    addPartner(newPartnerName, Number(newPartnerCapital || 0), Number(newPartnerEquity || 0) / 100);
    setNewPartnerName('');
    setNewPartnerCapital('');
    setNewPartnerEquity('');
  };

  const handlePartnerChange = (id: string, field: string, value: string) => {
    if (field === 'name') {
      updatePartner(id, { name: value });
    } else if (field === 'capital') {
      updatePartner(id, { capital: Number(value) });
    } else if (field === 'equity') {
      updatePartner(id, { equity: Number(value) / 100 });
    }
  };

  const fmtM = (v: number) => '$' + Math.round(v).toLocaleString();

  return (
    <section className="fade-in" style={{ padding: '2rem' }}>
      <div className="view-header">
        <h2>Sociedad y Socios (React)</h2>
        <p>Configuración central — los cambios recalculan automáticamente en el Zustand Store</p>
      </div>

      <div className="kpi-strip" style={{ marginBottom: '2rem' }}>
        <div className={`kpi-card neutral`}>
          <div className="kpi-title">Capital Total</div>
          <div className="kpi-val">{fmtM(activeProj.totalCapital)}</div>
          <div className="kpi-desc">{activeProj.partners.length} socios</div>
        </div>
        <div className={`kpi-card neutral`}>
          <div className="kpi-title">Inv. Requerida</div>
          <div className="kpi-val">{fmtM(consol.capitalCommitted)}</div>
          <div className="kpi-desc">Capex de {consol.branchCount || 0} suc + reserva</div>
        </div>
        <div className={`kpi-card ${capStatus}`}>
          <div className="kpi-title">Libre / Faltante</div>
          <div className="kpi-val">{fmtM(consol.capitalFree)}</div>
          <div className="kpi-desc">{capStatus === 'good' ? 'Capital Disponible' : '⚠️ Presupuesto Excedido'}</div>
        </div>
        <div className={`kpi-card ${consol.avgMonthlyNet >= 0 ? 'good' : 'bad'}`}>
          <div className="kpi-title">Ganancia/mes</div>
          <div className="kpi-val">{fmtM(consol.avgMonthlyNet)}</div>
          <div className="kpi-desc">en {consol.branchCount || 0} suc.</div>
        </div>
        <div className={`kpi-card ${consol.avgScore >= 70 ? 'good' : consol.avgScore >= 50 ? 'warn' : 'bad'}`}>
          <div className="kpi-title">Calificación</div>
          <div className="kpi-val">{consol.avgScore}/100</div>
          <div className="kpi-desc">Promedio portafolio</div>
        </div>
      </div>

      <div className="empresa-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(400px, 1.5fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left: Company Data */}
        <div className="neu-card">
          <h3 className="card-title">Datos de la Sociedad</h3>
          <div className="form-group">
            <label>Nombre / Razón Social</label>
            <input type="text" className="input-text" value={activeProj.name} onChange={e => updateProyecto(activeEmpresaId, activeProyectoId, { name: e.target.value })} />
            <small className="field-help">El nombre legal de tu sociedad holding</small>
          </div>
          
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
             <div className="form-group">
              <label>Capital Total</label>
              <input type="number" className="input-text" disabled title="Se calcula de socios" value={activeProj.totalCapital} />
            </div>
            <div className="form-group">
              <label>Reserva Corporativa</label>
              <input type="number" className="input-text" value={activeProj.corporateReserve} onChange={e => updateProyecto(activeEmpresaId, activeProyectoId, { corporateReserve: Number(e.target.value) })}  step="50000" />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Gastos Corporativos Mensuales</label>
            <input type="number" className="input-text" value={activeProj.corporateExpenses} onChange={e => updateProyecto(activeEmpresaId, activeProyectoId, { corporateExpenses: Number(e.target.value) })} step="1000" />
            <small className="field-help">Gastos fijos de la empresa matriz al mes</small>
          </div>
        </div>

        {/* Right: Partners */}
        <div className="neu-card">
          <h3 className="card-title">
            Socios 
            {!equityOk && (
              <span style={{color: 'var(--red)', fontSize: '0.7rem', marginLeft: '1rem'}}>
                ⚠️ {Math.round(totalEquity * 100)}% (debe ser 100%)
              </span>
            )}
            {equityOk && (
              <span style={{color: 'var(--green)', fontSize: '0.7rem', marginLeft: '1rem'}}>
                ✅ 100%
              </span>
            )}
          </h3>

          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {activeProj.partners.map(p => {
               const pData = consol.perPartner?.find((cp: any) => cp.id === p.id);
               return (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 40px', gap: '0.5rem', alignItems: 'center', padding: '0.5rem', background: 'var(--bg)', borderRadius: 'var(--r-sm)' }}>
                  <input type="text" className="input-text" value={p.name} onChange={e => handlePartnerChange(p.id, 'name', e.target.value)} style={{fontSize:'0.8rem', padding:'0.4rem'}} />
                  <input type="number" className="input-text num" value={p.capital} onChange={e => handlePartnerChange(p.id, 'capital', e.target.value)} style={{fontSize:'0.8rem', padding:'0.4rem'}} />
                  <input type="number" className="input-text num" value={Math.round(p.equity * 100)} onChange={e => handlePartnerChange(p.id, 'equity', e.target.value)} style={{fontSize:'0.8rem', padding:'0.4rem'}} />
                  <button className="btn-sm warn" onClick={() => removePartner(p.id)} style={{justifyContent: 'center', width: '30px', height: '30px', padding: 0}}>✖</button>
                  {pData && (
                    <div style={{gridColumn: '1 / -1', fontSize: '0.7rem', color: 'var(--text-3)', display: 'flex', gap: '1rem'}}>
                      <span>Mensual: {fmtM(pData.monthlyReturn)}</span>
                      <span>Total (5Y): {fmtM(pData.totalReturn60)}</span>
                      <span>ROI: {pData.roi60 ? pData.roi60.toFixed(1) + '%' : 'N/A'}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 40px', gap: '0.5rem', marginTop: '1rem', alignItems: 'center', paddingTop: '1rem', borderTop: '1px dashed var(--border)' }}>
            <input type="text" className="input-text" placeholder="Nombre" value={newPartnerName} onChange={e => setNewPartnerName(e.target.value)} style={{fontSize:'0.8rem'}} />
            <input type="number" className="input-text num" placeholder="Capital ($)" value={newPartnerCapital} onChange={e => setNewPartnerCapital(e.target.value)} style={{fontSize:'0.8rem'}} />
            <input type="number" className="input-text num" placeholder="Equidad %" value={newPartnerEquity} onChange={e => setNewPartnerEquity(e.target.value)} style={{fontSize:'0.8rem'}} />
            <button className="btn-sm primary" onClick={handleAddPartner} style={{height: '100%', fontSize: '1.2rem', justifyContent: 'center', padding: 0}}>＋</button>
          </div>
        </div>

      </div>
    </section>
  );
};
