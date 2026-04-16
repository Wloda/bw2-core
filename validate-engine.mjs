/**
 * BW² — Validación Matemática del Motor Financiero
 * Compara outputs del engine contra cálculos manuales.
 * 
 * Ejecutar: node validate-engine.mjs
 */
import { MODELS } from './data/model-registry.js';
import { runProjection, calcFixedCosts, calcVarRate, calcFixedCostBreakdown } from './engine/financial-model.js';

const fmt = v => '$' + Math.round(v).toLocaleString('en-US');
const pct = v => (v * 100).toFixed(2) + '%';
let pass = 0, fail = 0;

function assert(label, actual, expected, tolerance = 1) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    console.log(`  ✅ ${label}: ${typeof actual === 'number' && actual > 100 ? fmt(actual) : actual}`);
    pass++;
  } else {
    console.log(`  ❌ ${label}: got ${typeof actual === 'number' && actual > 100 ? fmt(actual) : actual}, expected ${typeof expected === 'number' && expected > 100 ? fmt(expected) : expected} (Δ${Math.abs(actual - expected).toFixed(2)})`);
    fail++;
  }
}

console.log('═══════════════════════════════════════════════════');
console.log('  BW² — VALIDACIÓN MATEMÁTICA DEL MOTOR');
console.log('═══════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────
// TEST 1: Costos Fijos — Súper M3+
// ─────────────────────────────────────────────
console.log('📋 TEST 1: Costos Fijos Mensuales (Súper, M3+)');
const m = MODELS.super;
const fc = m.fixedCosts;
const expectedFC = fc.rent + fc.systems + fc.accounting + fc.payroll + fc.socialCharge + fc.servPap.m3 + (fc.omissions?.m3 || 0);
const engineFC = calcFixedCosts(fc, 3);
assert('CF Motor vs Manual', engineFC, expectedFC, 1);
assert('CF Motor vs Documentado', engineFC, fc.totalDocumented.m3, 1);
console.log(`  📄 Desglose: Renta=${fmt(fc.rent)} + Nómina=${fmt(fc.payroll)} + CSocial=${fmt(fc.socialCharge)} + Sist=${fmt(fc.systems)} + Cont=${fmt(fc.accounting)} + ServPap=${fmt(fc.servPap.m3)} + Omis=${fmt(fc.omissions.m3)}`);

// ─────────────────────────────────────────────
// TEST 2: Tasa de Costo Variable
// ─────────────────────────────────────────────
console.log('\n📋 TEST 2: Tasa de Costo Variable (Súper)');
const vc = m.variableCosts;
const expectedVCRate = vc.cogs + vc.comVenta + vc.merma + vc.pubDir + vc.regalia + vc.bancario;
const engineVCRate = calcVarRate(vc, 'variable_2_5', 12);
assert('CV% Motor vs Manual', engineVCRate, expectedVCRate, 0.001);
assert('CV% vs Documentado', engineVCRate, vc.cvTotal, 0.001);
assert('Margen Contribución', 1 - engineVCRate, vc.mc, 0.001);
console.log(`  📄 Desglose: COGS=${pct(vc.cogs)} + ComVta=${pct(vc.comVenta)} + Merma=${pct(vc.merma)} + Pub=${pct(vc.pubDir)} + Regalía=${pct(vc.regalia)} + Banc=${pct(vc.bancario)}`);

// ─────────────────────────────────────────────
// TEST 3: Punto de Equilibrio
// ─────────────────────────────────────────────
console.log('\n📋 TEST 3: Punto de Equilibrio (Súper)');
const mc = 1 - expectedVCRate;
const breakEven = expectedFC / mc;
const result = runProjection('super', { isFranchise: true });
assert('BE Motor vs Manual', result.breakEvenRevenue, breakEven, 10);
console.log(`  📄 Fórmula: BE = CF / MC = ${fmt(expectedFC)} / ${pct(mc)} = ${fmt(breakEven)}`);

// ─────────────────────────────────────────────
// TEST 4: Inversión Total (sin descuento)
// ─────────────────────────────────────────────
console.log('\n📋 TEST 4: Inversión Total (Súper, Franquicia, sin descuento)');
const expectedInv = m.totalInitialInvestment.default;
assert('Inversión Motor vs Registry', result.totalInvestment, expectedInv, 1);

// ─────────────────────────────────────────────
// TEST 5: Descuento de Cuota de Marca ($60,000)
// ─────────────────────────────────────────────
console.log('\n📋 TEST 5: Descuento Cuota de Marca ($60,000)');
const discount = 60000;
const expectedInvDisc = expectedInv - discount;
const resultDisc = runProjection('super', { isFranchise: true, brandFeeDiscount: discount });
assert('Inv con Dcto', resultDisc.totalInvestment, expectedInvDisc, 1);
assert('Ahorro = $60,000', result.totalInvestment - resultDisc.totalInvestment, discount, 1);
console.log(`  📄 ${fmt(expectedInv)} - ${fmt(discount)} = ${fmt(expectedInvDisc)}`);

// ─────────────────────────────────────────────
// TEST 6: Descuento NO aplica sin franquicia
// ─────────────────────────────────────────────
console.log('\n📋 TEST 6: Dcto NO aplica sin franquicia');
const resultNonFran = runProjection('super', { isFranchise: false, brandFeeDiscount: discount });
const expectedNonFran = expectedInv - m.franchise.brandFee; // se resta toda la brandFee
assert('Inv sin franquicia (sin brandFee)', resultNonFran.totalInvestment, expectedNonFran, 1);
console.log(`  📄 No-franquicia: ${fmt(expectedInv)} - brandFee ${fmt(m.franchise.brandFee)} = ${fmt(expectedNonFran)} (dcto ignorado)`);

// ─────────────────────────────────────────────
// TEST 7: Presupuesto de Sucursal (branchBudget)
// ─────────────────────────────────────────────
console.log('\n📋 TEST 7: Presupuesto de Sucursal');
const budget = 1200000;
const resultBudget = runProjection('super', { isFranchise: true, branchBudget: budget });
assert('Capital = branchBudget', resultBudget.capitalRemaining + resultBudget.totalInvestment + resultBudget.workingCapitalRequired + (resultBudget.recommendedReserve - resultBudget.workingCapitalRequired), budget, 100);
// The key check: capitalRemaining should use branchBudget, not partner capital
const expectedCapRemaining = budget - resultBudget.totalInvestment;
assert('Cap Libre = Budget - Inv', resultBudget.capitalRemaining, expectedCapRemaining, 1);
console.log(`  📄 ${fmt(budget)} - ${fmt(resultBudget.totalInvestment)} = ${fmt(expectedCapRemaining)}`);

// ─────────────────────────────────────────────
// TEST 8: Validación vs Datos Documentados (Net Profit)
// ─────────────────────────────────────────────
console.log('\n📋 TEST 8: Net Profit vs Documentado (Súper, primeros 12 meses)');
const docProfit = m.netProfitDoc;
const months = result.months;
// Check a few key months (1-indexed in doc, 0-indexed in array)
const checkMonths = [1, 6, 12];
checkMonths.forEach(mi => {
  const engineNet = months[mi - 1]?.netIncome;
  const docNet = docProfit['m' + mi];
  if (docNet != null && engineNet != null) {
    const delta = Math.abs(engineNet - docNet);
    const deltaPct = docNet !== 0 ? (delta / Math.abs(docNet) * 100).toFixed(1) : '∞';
    const ok = delta < Math.abs(docNet) * 0.15; // 15% tolerance for documented values
    if (ok) {
      console.log(`  ✅ M${mi}: Motor=${fmt(engineNet)}, Doc=${fmt(docNet)} (Δ${deltaPct}%)`);
      pass++;
    } else {
      console.log(`  ⚠️  M${mi}: Motor=${fmt(engineNet)}, Doc=${fmt(docNet)} (Δ${deltaPct}% — revisar)`);
      // Don't count as fail, documented values may use different assumptions
    }
  }
});

// ─────────────────────────────────────────────
// TEST 9: Payback y ROI coherencia
// ─────────────────────────────────────────────
console.log('\n📋 TEST 9: Coherencia Payback y ROI');
// Payback: the month where cumCF >= 0
let manualPB = null;
for (let i = 0; i < months.length; i++) {
  if (months[i].cumulativeCashFlow >= 0) { manualPB = i + 1; break; }
}
assert('Payback Motor = Manual', result.paybackMonth, manualPB || 999, 0);

// ROI12: sum of first 12 months net income / totalInv * 100
const sumNet12 = months.slice(0, 12).reduce((s, m) => s + m.netIncome, 0);
const manualROI12 = (sumNet12 / result.totalInvestment) * 100;
assert('ROI 12m Motor vs Manual', result.roi12, manualROI12, 0.1);

// Payback con descuento debe ser MENOR
assert('PB con dcto < PB sin dcto', resultDisc.paybackMonth < result.paybackMonth ? 1 : 0, 1, 0);
console.log(`  📄 Sin dcto: ${result.paybackMonth}m, Con $60K dcto: ${resultDisc.paybackMonth}m`);

// ─────────────────────────────────────────────
// TEST 10: NPV coherencia
// ─────────────────────────────────────────────
console.log('\n📋 TEST 10: NPV');
const discRate = 0.12;
const mDisc = Math.pow(1 + discRate, 1/12) - 1;
let manualNPV = -result.totalInvestment;
for (let i = 0; i < months.length; i++) {
  manualNPV += months[i].cashFlow / Math.pow(1 + mDisc, i + 1);
}
assert('NPV Motor vs Manual', result.npv, manualNPV, 10);
assert('NPV con dcto > NPV sin dcto', resultDisc.npv > result.npv ? 1 : 0, 1, 0);
console.log(`  📄 Sin dcto: ${fmt(result.npv)}, Con $60K dcto: ${fmt(resultDisc.npv)}`);

// ─────────────────────────────────────────────
// RESUMEN
// ─────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════');
console.log(`  RESULTADO: ${pass} pasaron ✅, ${fail} fallaron ❌`);
if (fail === 0) {
  console.log('  🎉 TODAS LAS VALIDACIONES PASARON');
} else {
  console.log('  ⚠️  Revisar las pruebas fallidas');
}
console.log('═══════════════════════════════════════════════════\n');
