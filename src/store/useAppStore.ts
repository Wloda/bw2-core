import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STORAGE_KEY = 'bw2_workspace';

function uid(prefix: string) {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

export interface Partner {
  id: string;
  name: string;
  capital: number;
  equity: number;
}

export interface Branch {
  id: string;
  name: string;
  format: string;
  colonia: string;
  coloniaFull?: string;
  zona: string;
  ciudad: string;
  estimatedOpenDate: string | null;
  status: 'planned' | 'active' | 'closed';
  scenarioId: 'base' | 'conservative' | 'upside';
  overrides: any;
  locationStudy: any;
  notes: string;
  results?: any;
}

export interface Proyecto {
  id: string;
  name: string;
  isFranchise: boolean;
  logo: string | null;
  totalCapital: number;
  corporateReserve: number;
  corporateExpenses: number;
  partners: Partner[];
  branches: Branch[];
  createdAt: string;
  overrides?: any;
}

export interface Empresa {
  id: string;
  name: string;
  logo: string | null;
  settings?: any;
  createdAt: string;
  proyectos: Proyecto[];
}

export interface Workspace {
  id: string;
  empresas: Empresa[];
  activeEmpresaId: string | null;
  activeProyectoId: string | null;
}

interface AppState extends Workspace {
  // Actions
  setActiveEmpresa: (id: string) => void;
  setActiveProyecto: (empresaId: string, proyectoId: string) => void;
  
  addEmpresa: (name: string) => string;
  updateEmpresa: (id: string, updates: Partial<Empresa>) => void;
  removeEmpresa: (id: string) => void;

  addProyecto: (empresaId: string, name: string) => string | null;
  updateProyecto: (empresaId: string, proyectoId: string, updates: Partial<Proyecto>) => void;
  removeProyecto: (empresaId: string, proyectoId: string) => void;

  addPartner: (name: string, capital: number, equity: number) => void;
  updatePartner: (partnerId: string, updates: Partial<Partner>) => void;
  removePartner: (partnerId: string) => void;

  addBranch: (format: string, name?: string, colonia?: string) => string | null;
  duplicateBranch: (branchId: string) => void;
  updateBranch: (branchId: string, updates: Partial<Branch>) => void;
  updateBranchOverrides: (branchId: string, overrides: any) => void;
  removeBranch: (branchId: string) => void;
}

function createDefaultWorkspace(): Workspace {
  const proj: Proyecto = {
    id: uid('proj'),
    name: 'FarmaTuya',
    isFranchise: true,
    logo: null,
    totalCapital: 2000000,
    corporateReserve: 200000,
    corporateExpenses: 0,
    partners: [
      { id: 'p1', name: 'Socio 1', capital: 1000000, equity: 0.50 },
      { id: 'p2', name: 'Socio 2', capital: 1000000, equity: 0.50 }
    ],
    branches: [],
    createdAt: new Date().toISOString()
  };
  const emp: Empresa = {
    id: uid('emp'),
    name: 'NOJOM',
    logo: null,
    createdAt: new Date().toISOString(),
    proyectos: [proj]
  };
  return {
    id: uid('bw2'),
    empresas: [emp],
    activeEmpresaId: emp.id,
    activeProyectoId: proj.id
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...createDefaultWorkspace(),

      setActiveEmpresa: (id) => set((state) => {
        const emp = state.empresas.find(e => e.id === id);
        return {
          activeEmpresaId: id,
          activeProyectoId: emp?.proyectos[0]?.id || null
        };
      }),

      setActiveProyecto: (empId, projId) => set({
        activeEmpresaId: empId,
        activeProyectoId: projId
      }),

      addEmpresa: (name) => {
        const emp: Empresa = {
          id: uid('emp'),
          name,
          logo: null,
          createdAt: new Date().toISOString(),
          proyectos: []
        };
        set((state) => ({ empresas: [...state.empresas, emp] }));
        return emp.id;
      },

      updateEmpresa: (id, updates) => set((state) => ({
        empresas: state.empresas.map(e => e.id === id ? { ...e, ...updates } : e)
      })),

      removeEmpresa: (id) => set((state) => {
        const filtered = state.empresas.filter(e => e.id !== id);
        let activeEmpId = state.activeEmpresaId;
        let activeProjId = state.activeProyectoId;
        if (activeEmpId === id) {
          activeEmpId = filtered[0]?.id || null;
          activeProjId = filtered[0]?.proyectos[0]?.id || null;
        }
        return { empresas: filtered, activeEmpresaId: activeEmpId, activeProyectoId: activeProjId };
      }),

      addProyecto: (empresaId, name) => {
        const proj: Proyecto = {
          id: uid('proj'),
          name,
          isFranchise: true,
          logo: null,
          totalCapital: 2000000,
          corporateReserve: 200000,
          corporateExpenses: 0,
          partners: [],
          branches: [],
          createdAt: new Date().toISOString()
        };
        set((state) => ({
          empresas: state.empresas.map(e => {
            if (e.id === empresaId) {
              return { ...e, proyectos: [...e.proyectos, proj] };
            }
            return e;
          })
        }));
        return proj.id;
      },

      updateProyecto: (empresaId, proyectoId, updates) => set((state) => ({
        empresas: state.empresas.map(e => e.id === empresaId ? {
          ...e,
          proyectos: e.proyectos.map(p => p.id === proyectoId ? { ...p, ...updates } : p)
        } : e)
      })),

      removeProyecto: (empresaId, proyectoId) => set((state) => {
        let newProjId = state.activeProyectoId;
        const mapped = state.empresas.map(e => {
          if (e.id === empresaId) {
            const filteredProjs = e.proyectos.filter(p => p.id !== proyectoId);
            if (state.activeProyectoId === proyectoId) {
              newProjId = filteredProjs[0]?.id || null;
            }
            return { ...e, proyectos: filteredProjs };
          }
          return e;
        });
        return { empresas: mapped, activeProyectoId: newProjId };
      }),

      addPartner: (name, capital, equity) => set((state) => {
        return {
          empresas: state.empresas.map(e => e.id === state.activeEmpresaId ? {
            ...e,
            proyectos: e.proyectos.map(p => {
              if (p.id === state.activeProyectoId) {
                const parts = [...p.partners, { id: uid('p'), name, capital, equity }];
                return { ...p, partners: parts, totalCapital: parts.reduce((sum, pt) => sum + pt.capital, 0) };
              }
              return p;
            })
          } : e)
        };
      }),

      updatePartner: (partnerId, updates) => set((state) => ({
        empresas: state.empresas.map(e => e.id === state.activeEmpresaId ? {
          ...e,
          proyectos: e.proyectos.map(p => {
            if (p.id === state.activeProyectoId) {
              const parts = p.partners.map(pt => pt.id === partnerId ? { ...pt, ...updates } : pt);
              return { ...p, partners: parts, totalCapital: parts.reduce((sum, pt) => sum + pt.capital, 0) };
            }
            return p;
          })
        } : e)
      })),

      removePartner: (partnerId) => set((state) => ({
        empresas: state.empresas.map(e => e.id === state.activeEmpresaId ? {
          ...e,
          proyectos: e.proyectos.map(p => {
            if (p.id === state.activeProyectoId) {
              const parts = p.partners.filter(pt => pt.id !== partnerId);
              return { ...p, partners: parts, totalCapital: parts.reduce((sum, pt) => sum + pt.capital, 0) };
            }
            return p;
          })
        } : e)
      })),

      addBranch: (format, name = 'Nueva Sucursal', colonia = '') => {
        // Will implement default overrides when we bring in TS engine
        const b: Branch = {
          id: uid('br'),
          name,
          format,
          colonia,
          zona: '',
          ciudad: '',
          estimatedOpenDate: null,
          status: 'planned',
          scenarioId: 'base',
          overrides: {},
          locationStudy: null,
          notes: ''
        };
        let branchId = null;
        set((state) => ({
          empresas: state.empresas.map(e => e.id === state.activeEmpresaId ? {
            ...e,
            proyectos: e.proyectos.map(p => {
              if (p.id === state.activeProyectoId) {
                branchId = b.id;
                return { ...p, branches: [...p.branches, b] };
              }
              return p;
            })
          } : e)
        }));
        return branchId;
      },

      duplicateBranch: (branchId) => set((state) => ({
        empresas: state.empresas.map(e => e.id === state.activeEmpresaId ? {
          ...e,
          proyectos: e.proyectos.map(p => {
            if (p.id === state.activeProyectoId) {
              const b = p.branches.find(x => x.id === branchId);
              if (b) {
                const copy: Branch = { ...JSON.parse(JSON.stringify(b)), id: uid('br'), name: b.name + ' (copia)' };
                return { ...p, branches: [...p.branches, copy] };
              }
            }
            return p;
          })
        } : e)
      })),

      updateBranch: (branchId, updates) => set((state) => ({
        empresas: state.empresas.map(e => e.id === state.activeEmpresaId ? {
          ...e,
          proyectos: e.proyectos.map(p => {
            if (p.id === state.activeProyectoId) {
              return {
                ...p,
                branches: p.branches.map(b => b.id === branchId ? { ...b, ...updates } : b)
              };
            }
            return p;
          })
        } : e)
      })),

      updateBranchOverrides: (branchId, overrides) => set((state) => ({
        empresas: state.empresas.map(e => e.id === state.activeEmpresaId ? {
          ...e,
          proyectos: e.proyectos.map(p => {
            if (p.id === state.activeProyectoId) {
              return {
                ...p,
                branches: p.branches.map(b => b.id === branchId ? { ...b, overrides } : b)
              };
            }
            return p;
          })
        } : e)
      })),

      removeBranch: (branchId) => set((state) => ({
        empresas: state.empresas.map(e => e.id === state.activeEmpresaId ? {
          ...e,
          proyectos: e.proyectos.map(p => {
            if (p.id === state.activeProyectoId) {
              return { ...p, branches: p.branches.filter(b => b.id !== branchId) };
            }
            return p;
          })
        } : e)
      }))

    }),
    {
      name: STORAGE_KEY,
    }
  )
);
