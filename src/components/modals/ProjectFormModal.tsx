import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';

export const ProjectFormModal: React.FC = () => {
  const { activeModalType, activeModalPayload, closeModal, empresas, activeEmpresaId, addProyecto, updateProyecto } = useAppStore();
  const isEditing = activeModalType === 'editar-proyecto';
  
  // payload is the empId for creative, and {empId, projId} for editing
  const targetEmpId = isEditing ? activeModalPayload.empId : (activeModalPayload || activeEmpresaId);
  const targetEmp = empresas.find(e => e.id === targetEmpId);
  const targetProj = isEditing ? targetEmp?.proyectos.find(p => p.id === activeModalPayload.projId) : null;

  const [name, setName] = useState(targetProj?.name || '');
  const [logo, setLogo] = useState<string | null>(targetProj?.logo || null);
  const [isFranchise, setIsFranchise] = useState(targetProj?.isFranchise ?? true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!name.trim() || !targetEmpId) return;
    
    if (isEditing && activeModalPayload.projId) {
      updateProyecto(targetEmpId, activeModalPayload.projId, { name, logo, isFranchise });
    } else {
      const newId = addProyecto(targetEmpId, name);
      if (newId) {
        updateProyecto(targetEmpId, newId, { logo, isFranchise });
      }
    }

    if ((window as any).renderCurrentView) {
      (window as any).renderCurrentView();
    }
    
    closeModal();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLogo(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!targetEmp) return null;

  return (
    <div className="bw2-modal-overlay" onClick={closeModal}>
      <div className="bw2-modal" onClick={e => e.stopPropagation()}>
        <div className="bw2-modal-header">
          <h3>{isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h3>
          <button className="bw2-modal-close" onClick={closeModal}>✕</button>
        </div>
        <div className="bw2-modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
            Empresa: <strong>{targetEmp.name}</strong>
          </p>

          <div className="bw2-form-group">
            <label>Nombre del Proyecto</label>
            <input 
              type="text" 
              className="input-text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              autoFocus 
            />
          </div>

          <label className="bw2-checkbox" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={isFranchise} 
              onChange={e => setIsFranchise(e.target.checked)} 
            />
            <span>¿Es formato Franquicia? (Aplica regalías)</span>
          </label>

          <div className="bw2-form-group" style={{ marginTop: '1rem' }}>
            <label>Logo / Icono del Proyecto</label>
            <div 
              className="logo-upload-area" 
              style={{ padding: '1rem', border: '2px dashed var(--border)', borderRadius: 'var(--r-md)', textAlign: 'center', cursor: 'pointer' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {logo ? (
                <div className="bw2-preview-frame">
                  <img src={logo} alt="Preview" style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '8px' }} />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.5rem' }}>Haz clic para cambiar</p>
                </div>
              ) : (
                <div style={{ color: 'var(--text-2)' }}>
                  <span style={{ fontSize: '2rem' }}>📷</span>
                  <p>Arrastra una imagen o <strong>haz clic</strong></p>
                  <p style={{ fontSize: '0.7rem' }}>JPG, PNG · Máx 2MB</p>
                </div>
              )}
            </div>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange} 
            />
          </div>
        </div>
        <div className="bw2-modal-footer">
          <button className="btn-secondary" onClick={closeModal}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave} disabled={!name.trim()}>Guardar</button>
        </div>
      </div>
    </div>
  );
};
