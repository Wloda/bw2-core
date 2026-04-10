import { runProjection } from './engine/financial-model.js';
const _getf = () => 1.16;
const getOOP = (r) => (r.totalInvestment * _getf()) + (r.workingCapitalRequired || 0);

for (let inv = 800000; inv < 1600000; inv+=1) {
  const r = runProjection('super', { isFranchise: false, totalInitialInvestment: inv });
  if (Math.round(getOOP(r)) === 1427459) {
    console.log("EXACT MATCH! Initial Investment was:", inv);
    break;
  }
}
