import { runConsolidation } from './engine/enterprise-engine.js';

const mockEmp = {
  id: "emp1",
  partners: [],
  proyectos: [{
    id: "p1", totalCapital: 2000000, isFranchise: true,
    branches: [{
      id: "b1", proyectoId: "p1", format: "super", status: "active",
      overrides: { isFranchise: true, royaltyMode: "pago_unico" }
    }]
  }]
};

const _getf = () => 1.16;
const getOOP = (r) => (r.totalInvestment * _getf()) + (r.workingCapitalRequired || 0);

const consol = runConsolidation(mockEmp.proyectos[0], mockEmp);
console.log("FRESH OOP WITH PAGO UNICO:", getOOP(consol.branchResults[0].result));
