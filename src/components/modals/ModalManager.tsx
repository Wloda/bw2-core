import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { CompanyFormModal } from './CompanyFormModal';
import { ProjectFormModal } from './ProjectFormModal';

export const ModalManager: React.FC = () => {
  const { activeModalType, openModal } = useAppStore();

  React.useEffect(() => {
    const handleOpen = (e: any) => {
      if (e.detail?.type) openModal(e.detail.type, e.detail.payload);
    };
    window.addEventListener('bw2:open-modal', handleOpen);
    return () => window.removeEventListener('bw2:open-modal', handleOpen);
  }, [openModal]);

  if (!activeModalType) return null;

  switch (activeModalType) {
    case 'crear-empresa':
    case 'editar-empresa':
      return <CompanyFormModal />;
    case 'crear-proyecto':
    case 'editar-proyecto':
      return <ProjectFormModal />;
    default:
      return null;
  }
};
