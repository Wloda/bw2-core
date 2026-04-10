import { runProjection } from './engine/financial-model.js';
const r = runProjection('integral', {});
console.log("Integral EBITDA:", r.avgMonthlyEBITDA);
console.log("Integral OOP:", r.totalInvestment * 1.16 + r.workingCapitalRequired);
