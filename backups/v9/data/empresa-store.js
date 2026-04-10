/**
 * BW² — Multi-Empresa, Multi-Proyecto Store (v8)
 * Hierarchy: BW² Workspace → Empresas[] → Proyectos[] → Branches[]
 * Backward-compatible: getEmpresa() returns the active proyecto (same shape as before).
 * Persists to localStorage.
 */
import { MODELS } from './model-registry.js?v=bw37';

const STORAGE_KEY_PREFIX = 'bw2_workspace';
const LEGACY_KEY  = 'farmatuya_empresa';

/* ── Per-user storage key ── */
function _getActiveUserId() {
  try {
    const s = localStorage.getItem('bw2_session') || sessionStorage.getItem('bw2_session');
    if (s) { const j = JSON.parse(s); if (j && j.userId) return j.userId; }
  } catch(e) {}
  return null;
}

function _storageKey() {
  const uid = _getActiveUserId();
  return uid ? STORAGE_KEY_PREFIX + '_' + uid : STORAGE_KEY_PREFIX;
}

/* ── Build full overrides from template ── */
export function buildDefaultOverrides(format) {
  const model = MODELS[format];
  if (!model) return {};
  const inv = model.totalInitialInvestment || { min: 1000000, max: 1000000, default: 1000000 };
  return {
    fixedCosts: {
      rent: model.fixedCosts.rent,
      systems: model.fixedCosts.systems,
      accounting: model.fixedCosts.accounting,
      payroll: model.fixedCosts.payroll,
      socialCharge: model.fixedCosts.socialCharge,
      servPap: { ...model.fixedCosts.servPap },
      omissions: model.fixedCosts.omissions ? { ...model.fixedCosts.omissions } : null
    },
    variableCosts: {
      cogs: model.variableCosts.cogs,
      comVenta: model.variableCosts.comVenta,
      merma: model.variableCosts.merma,
      pubDir: model.variableCosts.pubDir,
      regalia: model.variableCosts.regalia,
      bancario: model.variableCosts.bancario
    },
    sales: { ...model.sales },
    totalInitialInvestment: inv.default,
    totalInitialInvestmentMin: inv.min,
    totalInitialInvestmentMax: inv.max,
    scenarioFactor: 1,
    royaltyMode: model.royaltyPromo ? model.royaltyPromo.default : 'variable_2_5'
  };
}

/* ── ID generator ── */
function uid(prefix) {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

/* ── Branch Factory ── */
export function createBranch(format, name = '', colonia = '', isFranchise = undefined) {
  // If retail, default to non-franchise. Otherwise, let undefined be inherited from Project
  const defaultFranchise = format.includes('shoes') ? false : undefined;
  return {
    id: uid('br'),
    name: name || 'Nueva Sucursal',
    format,
    colonia,
    zona: '',
    ciudad: '',
    estimatedOpenDate: null,
    status: 'planned',
    scenarioId: 'base',
    overrides: buildDefaultOverrides(format),
    locationStudy: null,
    notes: '',
    isFranchise: isFranchise !== undefined ? isFranchise : defaultFranchise
  };
}

/* ── Duplicate Branch ── */
export function duplicateBranch(branch) {
  return {
    ...JSON.parse(JSON.stringify(branch)),
    id: uid('br'),
    name: branch.name + ' (copia)',
    status: 'planned',
    colonia: '',
    coloniaFull: '',
    locationStudy: null
  };
}

/* ── Proyecto Factory ── */
function createProyecto(name = 'Nuevo Proyecto') {
  return {
    id: uid('proj'),
    name,
    isFranchise: true,
    logo: null,
    totalCapital: 1400000,
    corporateReserve: 200000,
    corporateExpenses: 0,
    partners: [
      { id: 'p1', name: 'Ari Jutorski', capital: 700000, equity: 0.50 },
      { id: 'p2', name: 'Benjamin Wlodawer', capital: 700000, equity: 0.50 }
    ],
    branches: [],
    createdAt: new Date().toISOString()
  };
}

/* ── Empresa Factory ── */
function createEmpresa(name = 'Mi Empresa') {
  return {
    id: uid('emp'),
    name,
    logo: null,
    createdAt: new Date().toISOString(),
    proyectos: [
      createProyecto('Proyecto 1')
    ]
  };
}

/* ── Default Workspace ── */
function createDefaultWorkspace() {
  return {
    id: uid('bw2'),
    empresas: [],
    activeEmpresaId: null,
    activeProyectoId: null
  };
}

/* ── Migration from legacy single-empresa ── */
function migrateFromLegacy(legacy) {
  const emp = {
    id: legacy.id || uid('emp'),
    name: legacy.name || 'Mi Empresa',
    logo: null,
    createdAt: new Date().toISOString(),
    proyectos: [{
      id: uid('proj'),
      name: legacy.projectName || 'FarmaTuya',
      isFranchise: true,
      totalCapital: legacy.totalCapital || 2000000,
      corporateReserve: legacy.corporateReserve || 200000,
      corporateExpenses: legacy.corporateExpenses || 0,
      partners: legacy.partners || [],
      branches: legacy.branches || [],
      createdAt: new Date().toISOString()
    }]
  };
  return {
    id: uid('bw2'),
    empresas: [emp],
    activeEmpresaId: emp.id,
    activeProyectoId: emp.proyectos[0].id
  };
}

/* ══════════ STORE ══════════ */
let _workspace = null;
let _listeners = [];
let _loading = false;

function _load() {
  if (_workspace) return _workspace;

  _loading = true;
  const KEY = _storageKey();

  // Try per-user key first
  const saved = localStorage.getItem(KEY);
  if (saved) {
    try {
      _workspace = JSON.parse(saved);
      if (!_workspace || !_workspace.empresas) throw new Error('Invalid workspace');
      
      // Auto-migrate structure if user's local workspace is pre-Empresa level capital
      _workspace.empresas.forEach(emp => {
        if (emp.totalCapital === undefined && emp.proyectos && emp.proyectos.length > 0) {
          const p = emp.proyectos[0];
          emp.totalCapital = p.totalCapital || 2000000;
          emp.corporateReserve = p.corporateReserve || 0;
          emp.corporateExpenses = p.corporateExpenses || 0;
          emp.partners = p.partners || [];
        } else if (emp.totalCapital === undefined) {
          emp.totalCapital = 2000000;
          emp.corporateReserve = 0;
          emp.corporateExpenses = 0;
          emp.partners = [];
        }
      });
    } catch(e) {
      _workspace = null;
    }
  }
  
  // If no per-user workspace exists at all, try migrating from the shared (old) key.
  // IMPORTANT: only trigger when the per-user key is completely absent.
  // If the user already has a saved workspace (even with 0 empresas), respect it.
  if (!_workspace && KEY !== STORAGE_KEY_PREFIX) {
    const shared = localStorage.getItem(STORAGE_KEY_PREFIX);
    if (shared) {
      try {
        const parsed = JSON.parse(shared);
        if (parsed && parsed.empresas && parsed.empresas.length > 0) {
          // One-time migration from shared workspace to per-user key
          _workspace = parsed;
          localStorage.setItem(KEY, JSON.stringify(_workspace));
          console.log('[BW2] Migrated', parsed.empresas.length, 'empresa(s) from shared key to user-specific key');
        }
      } catch(e) {}
    }
  }

  if (!_workspace) {
    // Try legacy format and migrate
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      _workspace = migrateFromLegacy(JSON.parse(legacy));
      localStorage.setItem(KEY, JSON.stringify(_workspace));
      localStorage.removeItem(LEGACY_KEY);
    } else {
      _workspace = createDefaultWorkspace();
      localStorage.setItem(KEY, JSON.stringify(_workspace));
    }
  }

  // ── Migration: ensure all branches have proper overrides ──
  let dirty = false;
  _workspace.empresas.forEach(emp => {
    emp.proyectos.forEach(proj => {
      (proj.branches || []).forEach(b => {
        const model = MODELS[b.format];
        if (!model) return;
        const ov = b.overrides || {};
        const modelDefault = model.totalInitialInvestment?.default;
        const needsMigration = !ov.fixedCosts
          || ov.totalInitialInvestment == null
          || (modelDefault && ov.totalInitialInvestmentMax !== model.totalInitialInvestment.max);
        if (needsMigration) {
          b.overrides = buildDefaultOverrides(b.format);
          dirty = true;
        }
      });
    });
  });
  if (dirty) localStorage.setItem(_storageKey(), JSON.stringify(_workspace));

  _loading = false;
  return _workspace;
}

function _save() {
  try {
    localStorage.setItem(_storageKey(), JSON.stringify(_workspace));
  } catch(e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.error('[BW2] localStorage quota exceeded — data NOT saved');
      window.dispatchEvent(new CustomEvent('bw2:storage-error', { detail: { message: 'Almacenamiento lleno. Elimina imágenes o exporta antes de continuar.' } }));
    } else {
      console.error('[BW2] localStorage save error:', e);
      window.dispatchEvent(new CustomEvent('bw2:storage-error', { detail: { message: 'Error interno guardando progreso. Tu trabajo del tab actual no se guardará.' } }));
    }
  }
  _listeners.forEach(fn => fn(_workspace));
}

/**
 * Force reload workspace for the current authenticated user.
 * Call this after LOGIN to switch to the correct user's data.
 * Includes migration from the shared key for existing users.
 */
let _loginSnapshot = null;

export function switchUserWorkspace() {
  _workspace = null;
  _load();
  // Snapshot the workspace at login time so we can revert on "Salir sin Guardar"
  _loginSnapshot = JSON.stringify(_workspace);
  _listeners.forEach(fn => fn(_workspace));
}

/**
 * Initialize a brand-new empty workspace for a freshly registered user.
 * Call this after REGISTER to ensure new users start from zero.
 * This explicitly saves an empty workspace so migration from shared key is skipped.
 */
export function initNewUserWorkspace() {
  _workspace = createDefaultWorkspace();
  // Immediately persist to this user's per-user key
  localStorage.setItem(_storageKey(), JSON.stringify(_workspace));
  _loginSnapshot = JSON.stringify(_workspace);
  _listeners.forEach(fn => fn(_workspace));
}

/**
 * Discard all changes made since login by restoring the snapshot.
 */
export function discardSessionChanges() {
  if (_loginSnapshot) {
    localStorage.setItem(_storageKey(), _loginSnapshot);
  }
}

window.updateEmpresasFromReact = function(newEmpresas) {
  if (_workspace) {
    _workspace.empresas = newEmpresas;
    _save();
  }
};

export function onEmpresaChange(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(f => f !== fn); };
}

/* ══════════ WORKSPACE ══════════ */
export function getWorkspace() {
  return _load();
}

/* ══════════ EMPRESA CRUD ══════════ */
export function getEmpresas() {
  return _load().empresas;
}

export function getEmpresaById(empresaId) {
  return _load().empresas.find(e => e.id === empresaId) || null;
}

export function getActiveEmpresa() {
  const ws = _load();
  return ws.empresas.find(e => e.id === ws.activeEmpresaId) || ws.empresas[0] || null;
}

export function setActiveEmpresa(empresaId) {
  const ws = _load();
  const emp = ws.empresas.find(e => e.id === empresaId);
  if (emp) {
    ws.activeEmpresaId = empresaId;
    // Also set active proyecto to first of this empresa
    ws.activeProyectoId = emp.proyectos[0]?.id || null;
    _save();
  }
}

export function addEmpresa(name) {
  const ws = _load();
  const emp = createEmpresa(name);
  ws.empresas.push(emp);
  _save();
  return emp;
}

export function updateEmpresaData(empresaId, updates) {
  const emp = getEmpresaById(empresaId);
  if (emp) {
    if (updates.name !== undefined) emp.name = updates.name;
    if (updates.nombre !== undefined) emp.name = updates.nombre;
    if (updates.logo !== undefined) emp.logo = updates.logo;
    if (updates.capitalInicial !== undefined) emp.totalCapital = updates.capitalInicial;
    _save();
  }
}

export function removeEmpresa(empresaId) {
  const ws = _load();
  ws.empresas = ws.empresas.filter(e => e.id !== empresaId);
  if (ws.activeEmpresaId === empresaId) {
    ws.activeEmpresaId = ws.empresas[0]?.id || null;
    ws.activeProyectoId = ws.empresas[0]?.proyectos[0]?.id || null;
  }
  _save();
}

/* ══════════ PROYECTO CRUD ══════════ */
export function getProyectos(empresaId) {
  const emp = getEmpresaById(empresaId);
  return emp ? emp.proyectos : [];
}

export function getProyectoById(empresaId, proyectoId) {
  const emp = getEmpresaById(empresaId);
  if (!emp) return null;
  return emp.proyectos.find(p => p.id === proyectoId) || null;
}

export function getActiveProyecto() {
  const ws = _load();
  const emp = ws.empresas.find(e => e.id === ws.activeEmpresaId);
  if (!emp) return null;
  return emp.proyectos.find(p => p.id === ws.activeProyectoId) || emp.proyectos[0] || null;
}

export function setActiveProyecto(empresaId, proyectoId) {
  const ws = _load();
  ws.activeEmpresaId = empresaId;
  ws.activeProyectoId = proyectoId;
  _save();
}

export function addProyecto(empresaId, name) {
  const emp = getEmpresaById(empresaId);
  if (!emp) return null;
  const proj = createProyecto(name);
  emp.proyectos.push(proj);
  _save();
  return proj;
}

export function updateProyecto(empresaId, proyectoId, updates) {
  const proj = getProyectoById(empresaId, proyectoId);
  if (proj) {
    if (updates.name !== undefined) proj.name = updates.name;
    if (updates.isFranchise !== undefined) proj.isFranchise = updates.isFranchise;
    if (updates.logo !== undefined) proj.logo = updates.logo;
    if (updates.totalCapital !== undefined) proj.totalCapital = updates.totalCapital;
    if (updates.corporateReserve !== undefined) proj.corporateReserve = updates.corporateReserve;
    if (updates.corporateExpenses !== undefined) proj.corporateExpenses = updates.corporateExpenses;
    _save();
  }
}

export function removeProyecto(empresaId, proyectoId) {
  const emp = getEmpresaById(empresaId);
  if (!emp) return;
  emp.proyectos = emp.proyectos.filter(p => p.id !== proyectoId);
  const ws = _load();
  if (ws.activeProyectoId === proyectoId) {
    ws.activeProyectoId = emp.proyectos[0]?.id || null;
  }
  _save();
}

/* ══════════ BACKWARD-COMPATIBLE API ══════════ */
/* getEmpresa() returns the active proyecto — same shape as old empresa */
export function getEmpresa() {
  return getActiveProyecto();
}

export function updateEmpresa(updates) {
  const emp = getActiveEmpresa();
  const proj = getActiveProyecto();
  
  if (emp) {
    if (updates.name !== undefined) emp.name = updates.name;
    if (updates.logo !== undefined) emp.logo = updates.logo;
    if (updates.settings !== undefined) emp.settings = updates.settings;
  }
  
  if (proj) {
    if (updates.projectName !== undefined) proj.name = updates.projectName;
    if (updates.totalCapital !== undefined) proj.totalCapital = updates.totalCapital;
    if (updates.corporateReserve !== undefined) proj.corporateReserve = updates.corporateReserve;
    if (updates.corporateExpenses !== undefined) proj.corporateExpenses = updates.corporateExpenses;
    if (updates.overrides !== undefined) proj.overrides = updates.overrides;
  }
  
  _save();
}

export function resetEmpresa() {
  const ws = _load();
  const emp = getActiveEmpresa();
  if (!emp) return;
  const defaultProj = createProyecto('FarmaTuya');
  emp.proyectos = [defaultProj];
  ws.activeProyectoId = defaultProj.id;
  _save();
}

/* ── Partners (on active proyecto) ── */

/** Compute a partner's total capital from their transaction ledger */
export function getPartnerCapital(partner) {
  if (!partner.transactions || partner.transactions.length === 0) return Number(partner.capital || 0);
  return partner.transactions.reduce((sum, tx) => {
    if (tx.type === 'aportacion' || tx.type === 'prestamo') return sum + Number(tx.amount || 0);
    if (tx.type === 'retiro' || tx.type === 'devolucion' || tx.type === 'distribucion') return sum - Number(tx.amount || 0);
    return sum;
  }, 0);
}

/** Auto-migrate legacy capital → transactions (idempotent) */
function _migratePartnerTransactions(target) {
  if (!target || !target.partners) return;
  target.partners.forEach(p => {
    if (!p.transactions) p.transactions = [];
    if (p.transactions.length === 0 && Number(p.capital || 0) > 0) {
      p.transactions.push({
        id: uid('tx'),
        type: 'aportacion',
        amount: Number(p.capital),
        date: new Date().toISOString().slice(0, 10),
        note: 'Capital inicial (migrado)'
      });
    }
  });
}

function _recalcEquity(target) {
  _migratePartnerTransactions(target);
  target.totalCapital = target.partners.reduce((sum, p) => sum + getPartnerCapital(p), 0);
  target.partners.forEach(p => {
    p.capital = getPartnerCapital(p);
    p.equity = target.totalCapital > 0 ? getPartnerCapital(p) / target.totalCapital : 0;
  });
}

export function addPartner(name, capital, equity) {
  const emp = getActiveEmpresa();
  if (!emp) return;
  if (!emp.partners) emp.partners = [];
  const partner = {
    id: uid('p'),
    name, capital, equity,
    transactions: [{
      id: uid('tx'),
      type: 'aportacion',
      amount: Number(capital),
      date: new Date().toISOString().slice(0, 10),
      note: 'Capital inicial'
    }]
  };
  emp.partners.push(partner);
  _recalcEquity(emp);
  _save();
}

export function updatePartner(partnerId, updates) {
  const emp = getActiveEmpresa();
  if (!emp || !emp.partners) return;
  const p = emp.partners.find(p => p.id === partnerId);
  if (p) {
    if (updates.capital !== undefined && Number(updates.capital) !== getPartnerCapital(p)) {
      const diff = Number(updates.capital) - getPartnerCapital(p);
      if (!p.transactions) p.transactions = [];
      p.transactions.push({
        id: uid('tx'),
        type: diff > 0 ? 'aportacion' : 'retiro',
        amount: Math.abs(diff),
        date: new Date().toISOString().slice(0, 10),
        note: 'Ajuste de capital'
      });
      delete updates.capital;
    }
    Object.assign(p, updates);
    _recalcEquity(emp);
    _save(); 
  }
}

export function removePartner(partnerId) {
  const emp = getActiveEmpresa();
  if (!emp || !emp.partners) return;
  emp.partners = emp.partners.filter(p => p.id !== partnerId);
  _recalcEquity(emp);
  _save();
}

export function addPartnerTransaction(partnerId, tx) {
  const emp = getActiveEmpresa();
  if (!emp || !emp.partners) return null;
  const p = emp.partners.find(p => p.id === partnerId);
  if (!p) return null;
  if (!p.transactions) p.transactions = [];
  const transaction = { id: uid('tx'), ...tx };
  p.transactions.push(transaction);
  _recalcEquity(emp);
  _save();
  return transaction;
}

export function removePartnerTransaction(partnerId, txId) {
  const emp = getActiveEmpresa();
  if (!emp || !emp.partners) return;
  const p = emp.partners.find(p => p.id === partnerId);
  if (!p || !p.transactions) return;
  p.transactions = p.transactions.filter(tx => tx.id !== txId);
  _recalcEquity(emp);
  _save();
}

/* ── Branch CRUD (on active proyecto) ── */
export function addBranch(format, name, colonia, isFranchise = undefined) {
  const proj = getActiveProyecto();
  if (!proj) return null;
  const b = createBranch(format, name, colonia, isFranchise);
  proj.branches.push(b);
  _save();
  return b;
}

export function updateBranch(branchId, updates) {
  const proj = getActiveProyecto();
  if (!proj) return;
  const b = proj.branches.find(b => b.id === branchId);
  if (b) { Object.assign(b, updates); _save(); }
}

export function updateBranchOverrides(branchId, overrides) {
  const proj = getActiveProyecto();
  if (!proj) return;
  const b = proj.branches.find(b => b.id === branchId);
  if (b) { b.overrides = { ...b.overrides, ...overrides }; _save(); }
}

export function dupBranch(branchId) {
  const proj = getActiveProyecto();
  if (!proj) return null;
  const b = proj.branches.find(b => b.id === branchId);
  if (!b) return null;
  const dup = duplicateBranch(b);
  proj.branches.push(dup);
  _save();
  return dup;
}

export function archiveBranch(branchId) {
  const proj = getActiveProyecto();
  if (!proj) return;
  const b = proj.branches.find(b => b.id === branchId);
  if (b) { b.status = 'archived'; _save(); }
}

export function activateBranch(branchId) {
  const proj = getActiveProyecto();
  if (!proj) return;
  const b = proj.branches.find(b => b.id === branchId);
  if (b) { b.status = 'active'; _save(); }
}

export function restoreBranch(branchId) {
  const proj = getActiveProyecto();
  if (!proj) return;
  const b = proj.branches.find(b => b.id === branchId);
  if (b) { b.status = 'planned'; _save(); }
}

export function removeBranch(branchId) {
  const proj = getActiveProyecto();
  if (!proj) return;
  proj.branches = proj.branches.filter(b => b.id !== branchId);
  _save();
}

export function getBranch(branchId) {
  const proj = getActiveProyecto();
  if (!proj) return null;
  return proj.branches.find(b => b.id === branchId) || null;
}

export function getActiveBranches() {
  const proj = getActiveProyecto();
  if (!proj) return [];
  return proj.branches.filter(b => b.status !== 'paused' && b.status !== 'archived');
}

/* ── Update branch location study ── */
export function updateBranchLocation(branchId, study) {
  const proj = getActiveProyecto();
  if (!proj) return;
  const b = proj.branches.find(b => b.id === branchId);
  if (b) { b.locationStudy = study; _save(); }
}

/* ── Reset branch to format defaults ── */
export function resetBranchToDefaults(branchId) {
  const proj = getActiveProyecto();
  if (!proj) return;
  const b = proj.branches.find(b => b.id === branchId);
  if (b) { b.overrides = buildDefaultOverrides(b.format); _save(); }
}
