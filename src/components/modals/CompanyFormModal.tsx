import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';

export const CompanyFormModal: React.FC = () => {
  const { activeModalType, activeModalPayload, closeModal, empresas, addEmpresa, updateEmpresa } = useAppStore();
  const isEditing = activeModalType === 'editar-empresa';
  
  const emp = isEditing ? empresas.find(e => e.id === activeModalPayload) : null;
  const [name, setName] = useState(emp?.name || '');
  const [logo, setLogo] = useState<string | null>(emp?.logo || null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!name.trim()) return;
    
    if (isEditing && activeModalPayload) {
      updateEmpresa(activeModalPayload, { name, logo });
    } else {
      const newId = addEmpresa(name);
      updateEmpresa(newId, { logo }); // Add logo to newly created empresa
    }

    // Force legacy app to re-render Level 1 since we modified global store
    if ((window as any).renderBW2Home) {
      (window as any).renderBW2Home();
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

  return (
    <div className="bw2-modal-overlay" onClick={closeModal}>
      <div className="bw2-modal" onClick={e => e.stopPropagation()}>
        <div className="bw2-modal-header">
          <h3>{isEditing ? 'Editar Empresa' : 'Nueva Empresa'}</h3>
          <button className="bw2-modal-close" onClick={closeModal}>✕</button>
        </div>
        <div className="bw2-modal-body">
          <div className="bw2-form-group">
            <label>Nombre / Razón Social</label>
            <input 
              type="text" 
              className="input-text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              autoFocus 
            />
          </div>

          <div className="bw2-form-group" style={{ marginTop: '1rem' }}>
            <label>Logo de la Empresa</label>
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
