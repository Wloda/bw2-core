/**
 * BW² — PDF Export Module v9 (Executive Compact & Aligned)
 */
import { MODELS, SCENARIOS } from './data/model-registry.js?v=bw37';
import { runBranchProjection } from './engine/enterprise-engine.js?v=bw37';
import { generateChecklist, evaluateAlerts, runProjection } from './engine/financial-model.js?v=bw37';
import { calcCombinedMarketFactor } from './engine/location-engine.js?v=bw51';

const fm = v => '$' + Math.round(v).toLocaleString('es-MX');
const fp = v => (v * 100).toFixed(1) + '%';
const strip = s => String(s).replace(/[^\x00-\x7FáéíóúñÁÉÍÓÚÑ ]/g, '').trim();

const C = {
  n: '#0f172a', // Navy
  b: '#3b82f6', // Bright Blue
  s: '#64748b', // Slate (Text)
  g: '#f8fafc', // Light Gray (Cards)
  l: '#cbd5e1', // Divider Lines
  v: '#10b981', // Emerald (Good)
  r: '#ef4444', // Rose (Bad)
  mg: '#d1d5db',// Medium Gray (Base Line)
  bgH: '#f4f6f8'// Highlighted Col BG (Very subtle)
};

function rgb(hex) { return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]; }

// Professional 3-tier header: Empresa -> Modelo -> Sucursal
function drawHeader(doc, empresa, branch, dateStr) {
  doc.setFillColor(...rgb(C.n)); doc.rect(0, 0, 215.9, 20, 'F');
  doc.setFillColor(...rgb(C.b)); doc.rect(0, 20, 215.9, 1.2, 'F');
  
  // Left: BW2 Logo / App Name
  doc.setFontSize(14); doc.setTextColor('#ffffff'); doc.setFont('helvetica', 'bold');
  doc.text('BW²', 15, 13);
  
  const mLabel = MODELS[branch.format]?.label || branch.format;
  
  // Center: The Hierarchy
  doc.setFontSize(10); doc.text(strip(empresa?.name || 'Empresa Independiente').toUpperCase(), 108, 9, {align:'center'});
  
  doc.setFontSize(9); doc.setTextColor(C.l); doc.setFont('helvetica', 'normal');
  doc.text(`${strip(branch.name)}  •  Formato: ${strip(mLabel)}`, 108, 14, {align:'center'});
  
  // Right: Meta
  doc.setFontSize(6.5); doc.setTextColor('#94a3b8');
  doc.text(`Generado: ${dateStr}`, 200, 16, {align:'right'});
  return 28;
}

// Elegant Section Title
function h1(doc, text, y) {
  doc.setFontSize(9.5); doc.setTextColor(C.b); doc.setFont('helvetica', 'bold');
  doc.text(strip(text).toUpperCase(), 15, y);
  doc.setDrawColor(...rgb(C.l)); doc.setLineWidth(0.2);
  doc.line(15, y+1.5, 200, y+1.5);
  return y + 6;
}

// Thin Ribbon Alert for Market
function drawMarketRibbon(doc, diffRev, diffEbitda, mf, y) {
  doc.setFillColor(...rgb('#ecfdf5')); 
  doc.setDrawColor(...rgb(C.v)); doc.setLineWidth(0.3);
  doc.roundedRect(15, y, 185, 10, 1, 1, 'FD');
  
  doc.setFontSize(8); doc.setTextColor(C.v); doc.setFont('helvetica', 'bold');
  doc.text('IMPACTO DE UBICACIÓN:', 18, y + 6.5);
  
  doc.setFontSize(7.5); doc.setTextColor(C.n); doc.setFont('helvetica', 'normal');
  const txt = `Factores del entorno potencian proyección de ventas un ${((mf-1)*100).toFixed(1)}%. Equivalente a ${fm(diffEbitda)} MXN Extra Libres/Mes vs L.Base.`;
  doc.text(txt, 58, y + 6.5);
  return y + 16;
}

// Compact Investment Ribbon
function drawInvestmentRibbon(doc, title, val, cx, y, w) {
  doc.setFillColor(...rgb(C.g));
  doc.setDrawColor(...rgb(C.l)); doc.setLineWidth(0.2);
  doc.roundedRect(cx, y, w, 10, 1, 1, 'FD');
  doc.setFontSize(7.5); doc.setTextColor(C.s); doc.setFont('helvetica', 'normal');
  doc.text(title, cx + 4, y + 6.5);
  doc.setFontSize(10); doc.setTextColor(C.n); doc.setFont('helvetica', 'bold');
  doc.text(val, cx + w - 4, y + 7, {align:'right'});
  return y + 15;
}

// Compact Aligned Table (rh=6mm, fs=7pt)
function table(doc, headers, rows, x, y, widths, rightCols = [], highlightCols = []) {
  const rh = 6; const fs = 7; const tw = widths.reduce((a,b)=>a+b,0);
  
  doc.setFillColor(...rgb(C.n)); doc.rect(x, y, tw, rh, 'F');
  doc.setFontSize(7); doc.setTextColor('#ffffff'); doc.setFont('helvetica', 'bold');
  
  let cx = x;
  headers.forEach((h, i) => {
    if (highlightCols.includes(i)) {
      doc.setFillColor(...rgb('#1e293b')); doc.rect(cx, y, widths[i], rh, 'F');
    }
    const isR = rightCols.includes(i);
    doc.text(strip(h), isR ? cx+widths[i]-2 : cx+2, y+4, { align: isR?'right':'left' });
    cx += widths[i];
  });
  y += rh;
  
  doc.setFontSize(fs);
  rows.forEach((row, ri) => {
    if (y > 265) { doc.addPage(); y = 20; }
    if (ri % 2 === 0) { doc.setFillColor(...rgb(C.g)); doc.rect(x, y, tw, rh, 'F'); }
    else { doc.setFillColor('#ffffff'); doc.rect(x, y, tw, rh, 'F'); }
    
    // Subtle Highlighting
    highlightCols.forEach(hc => {
      let bx = x; for(let i=0; i<hc; i++) bx += widths[i];
      doc.setFillColor(...rgb(C.bgH)); doc.rect(bx, y, widths[hc], rh, 'F');
    });

    cx = x;
    row.forEach((cell, ci) => {
      let v = String(cell);
      let isBold = false;
      if (v.startsWith('!B!')) { isBold = true; v = v.substring(3); }
      v = strip(v);
      
      const neg = v.startsWith('-$') || (v.startsWith('-') && v.length > 1 && !v.includes(' '));
      const pos = v.startsWith('+$');
      doc.setTextColor(neg ? C.r : pos ? C.v : C.n);
      if (isBold) doc.setFont('helvetica', 'bold'); else doc.setFont('helvetica', 'normal');
      
      const isR = rightCols.includes(ci);
      doc.text(v, isR ? cx+widths[ci]-2 : cx+2, y+4, { align: isR?'right':'left' });
      cx += widths[ci];
    });
    
    doc.setDrawColor(...rgb(C.l)); doc.setLineWidth(0.1);
    doc.line(x, y+rh, x+tw, y+rh);
    y += rh;
  });
  return y + 5;
}

// Compact Dual Cash Flow Chart
function drawFriendlyDualCashFlow(doc, mBase, mMkt, hasMkt, x, y, w, h) {
  const pB = mBase.map(d=>d.cumulativeCashFlow);
  const pM = mMkt.map(d=>d.cumulativeCashFlow);
  const minV = Math.min(0, ...pB, ...pM), maxV = Math.max(0, ...pB, ...pM);
  const r = (maxV-minV)||1;
  const zeroY = y + h - ((0-minV)/r)*h;
  
  doc.setDrawColor(...rgb(C.l)); doc.setLineWidth(0.2);
  [0.25, 0.5, 0.75, 1].forEach(pct => doc.line(x, y+h*pct, x+w, y+h*pct));
  
  doc.setDrawColor(...rgb(C.n)); doc.setLineWidth(0.4); doc.line(x, zeroY, x+w, zeroY);
  
  const stX = w/(pM.length-1);
  
  if (hasMkt && String(pB) !== String(pM)) {
    doc.setDrawColor(...rgb(C.mg)); doc.setLineWidth(0.6);
    pB.forEach((v, i) => {
      const px = x + i*stX, py = y + h - ((v-minV)/r)*h;
      if (i>0) {
        const ox = x+(i-1)*stX, oy = y+h - ((pB[i-1]-minV)/r)*h;
        if (i%2===0) doc.line(ox, oy, px, py); // dashed
      }
      if(i>0 && pB[i-1]<0 && v>=0) {
        doc.setFillColor(...rgb(C.mg)); doc.circle(px, py, 1.2, 'F');
        doc.setFontSize(5); doc.setTextColor(C.s); doc.setFont('helvetica', 'normal');
        doc.text(`Base: Mes ${i+1}`, px+2, py-1.5);
      }
    });
  }
  
  doc.setDrawColor(...rgb(C.b)); doc.setLineWidth(1.2);
  pM.forEach((v, i) => {
    const px = x + i*stX, py = y + h - ((v-minV)/r)*h;
    if (i>0) doc.line(x+(i-1)*stX, y+h - ((pM[i-1]-minV)/r)*h, px, py);
    
    if(i>0 && pM[i-1]<0 && v>=0) {
      doc.setFillColor(...rgb(C.v)); doc.circle(px, py, 2, 'F');
      doc.setFontSize(7); doc.setTextColor(C.v); doc.setFont('helvetica', 'bold');
      doc.text(`¡Mes ${i+1}: Retorno!`, px-20, py-4);
    }
  });
  
  doc.setFontSize(6.5); doc.setTextColor(C.s); doc.setFont('helvetica', 'normal');
  doc.text(fm(maxV), x-2, y+3, {align:'right'}); 
  doc.text(fm(minV), x-2, y+h, {align:'right'});
  doc.text('Inicio (Mes 1)', x, y+h+4, {align:'center'});
  doc.text('Fin (Mes 60)', x+w, y+h+4, {align:'center'});
  
  if (hasMkt && String(pB) !== String(pM)) {
    doc.setFillColor(...rgb(C.b)); doc.rect(x+30, y+h+2, 4, 1.5, 'F');
    doc.text('Con Ubicación', x+36, y+h+3.5, {align:'left'});
    doc.setFillColor(...rgb(C.mg)); doc.rect(x+65, y+h+2, 4, 0.5, 'F');
    doc.text('Línea Base', x+71, y+h+3.5, {align:'left'});
  }
  return y + h + 10;
}

function runBaseInternal(branch, empresa) {
  const ov = { ...branch.overrides, scenarioFactor: 1 * (branch.overrides.scenarioFactor||1), partners: empresa?.partners||[] };
  return runProjection(branch.format, ov);
}

function footer(doc, p, t) {
  doc.setFontSize(6); doc.setTextColor(C.s); doc.setFont('helvetica', 'normal');
  doc.text(`Reporte Analítico BW² — Pág. ${p}/${t}`, 108, 274, {align:'center'});
}

export async function generateBranchPDF(branch, empresa) {
  const doc = new window.jspdf.jsPDF('p', 'mm', 'letter');
  
  const rMkt = runBranchProjection(branch, empresa);
  const chk = generateChecklist(rMkt);
  const al = evaluateAlerts(rMkt);
  const hasMkt = !!(branch.locationStudy?.scores?.factors);
  let rBase = rMkt, mf = 1;
  if (hasMkt) {
    rBase = runBaseInternal(branch, empresa);
    mf = calcCombinedMarketFactor(branch.locationStudy.scores.factors, branch.overrides?.marketStudyToggles||{}).combinedFactor;
  }
  
  const dStr = new Date().toLocaleDateString('es-MX', { year:'numeric', month:'short', day:'numeric' });
  const totalPages = 3;
  let y = 0, pg = 1;

  // ═════════════════════════════════════════════
  // PÁGINA 1: RESUMEN EJECUTIVO (Compacto)
  // ═════════════════════════════════════════════
  y = drawHeader(doc, empresa, branch, dStr);
  
  if (hasMkt && mf !== 1) {
    y = drawMarketRibbon(doc, rMkt.avgMonthlyRevenue - rBase.avgMonthlyRevenue, rMkt.avgMonthlyEBITDA - rBase.avgMonthlyEBITDA, mf, y);
  }

  y = h1(doc, '1. Radiografía Comparativa', y);
  
  y = drawInvestmentRibbon(doc, 'Capital de Inversión Seca Inicial (CaPex + Opex Inicial)', fm(rMkt.totalInvestment), 15, y, 185);
  y += 4;

  const cmpRows = [
    ['Ventas Promedio Mensual', fm(rBase.avgMonthlyRevenue), '!B!'+fm(rMkt.avgMonthlyRevenue), mf!==1?'!B!+'+fm(rMkt.avgMonthlyRevenue-rBase.avgMonthlyRevenue):'-'],
    ['Utilidad Libre (EBITDA Operativo)', fm(rBase.avgMonthlyEBITDA), '!B!'+fm(rMkt.avgMonthlyEBITDA), mf!==1?'!B!+'+fm(rMkt.avgMonthlyEBITDA-rBase.avgMonthlyEBITDA):'-'],
    ['Punto Equilibrio (Ventas de Salida)', fm(rBase.breakEvenRevenue), '!B!'+fm(rMkt.breakEvenRevenue), '-'],
    ['Mes Proyectado de Retorno', rBase.paybackMonth?rBase.paybackMonth+' meses':'Nunca', '!B!'+(rMkt.paybackMonth?rMkt.paybackMonth+' meses':'Nunca'), '-'],
  ];
  y = table(doc, ['Indicador Operativo', 'Escenario Base', 'Tu Sucursal Proyectada', 'Impacto (+ / -)'], cmpRows, 15, y, [55, 45, 45, 40], [1,2,3], [2]);

  y += 5;
  y = h1(doc, '2. Rentabilidad de Socios e Inversionistas', y);
  const pRows = rMkt.perPartnerMonthly.map(p => [p.name, '!B!'+fm(p.capital), fp(p.equity), '!B!'+fm(p.monthlyIncome), '!B!'+p.roi36.toFixed(1)+'%']);
  y = table(doc, ['Entidad (Socio)', 'Aportación', 'Equity %', 'Distribución Mensual', 'Rendimiento(3A)'], pRows, 15, y, [55, 35, 25, 35, 35], [1,2,3,4], []);

  y += 5;
  y = h1(doc, '3. Diagnóstico Estratégico', y);
  const chRows = chk.map(c => [c.item, c.pass ? '✓ APROBADO' : '✗ REPROBADO', c.detail]);
  y = table(doc, ['Requisito Analizado', 'Resolución', 'Diagnóstico Estructurado'], chRows, 15, y, [50, 25, 110]);

  if (al.length) {
    doc.setFontSize(8.5); doc.setTextColor(C.r); doc.setFont('helvetica', 'bold');
    doc.text('⚠️ ADVERTENCIAS DE MODELO:', 15, y+2); y += 6;
    doc.setFontSize(7); doc.setTextColor(C.n); doc.setFont('helvetica', 'normal');
    al.forEach(a => { doc.text(`- ${strip(a.label)}: ${strip(a.message)}`, 15, y); y += 4; });
  }

  footer(doc, pg++, totalPages);

  // ═════════════════════════════════════════════
  // PÁGINA 2: LÍNEA DE VIDA
  // ═════════════════════════════════════════════
  doc.addPage();
  y = drawHeader(doc, empresa, branch, dStr);

  y = h1(doc, '4. Trayectoria a 5 Años (Cash Flow)', y);
  y = drawFriendlyDualCashFlow(doc, rBase.months, rMkt.months, hasMkt, 25, y, 165, 50);
  y += 8;

  y = h1(doc, '5. Crecimiento Anual Sincronizado', y);
  const aB = rBase.annualSummary, aM = rMkt.annualSummary;
  const aR = ['year1','year2','year3','year4','year5'].filter(k=>aM[k]).map((k,i)=>[
    'Año '+(i+1), fm(aB[k].revenue), '!B!'+fm(aM[k].revenue), fm(aB[k].netIncome), '!B!'+fm(aM[k].netIncome), fp(aM[k].netIncome / aM[k].revenue)
  ]);
  y = table(doc, ['Período', 'Ingresos (Base)', 'Ingresos (Proyecto)', 'Utilidad (Base)', 'Utilidad (Proyecto)', 'Margen N.'], aR, 15, y, [20, 31, 36, 31, 36, 31], [1,2,3,4,5], [2, 4]);

  footer(doc, pg++, totalPages);

  // ═════════════════════════════════════════════
  // PÁGINA 3: P&L
  // ═════════════════════════════════════════════
  doc.addPage();
  y = drawHeader(doc, empresa, branch, dStr);

  y = h1(doc, '6. Gastos de Operación Fija Máxima', y);
  const bd = rMkt.fixedCostBreakdown;
  const rF = [
    ['Costos Fijos Asignados (Renta, Nómina base, Cargas, Sistemas)', fm(bd.renta+bd.nomina+bd.cargaSocial+bd.sistemas)], 
    ['Honorarios y Costos Externos (Contables, Legales)', fm(bd.serviciosPap + (bd.contabilidad||0))],
    ['!B!COSTO DIRECTO DURO', '!B!'+fm(rMkt.totalFixedMonthly)]
  ];
  y = table(doc, ['Agrupación de Centro de Costos', 'Gasto Mensual'], rF, 15, y, [130, 55], [1]);
  y += 5;

  y = h1(doc, '7. Bitácora de Flujos a 36 Meses (Tu Proyecto)', y);
  const mdata = rMkt.months.slice(0, 36).map(m=>[
    (m.preOpen?'P':'Mes ')+m.month, fm(m.revenue), fm(m.totalFixedCosts), fm(m.variableCosts), '!B!'+fm(m.netIncome), fm(m.cumulativeCashFlow)
  ]);
  y = table(doc, ['Mes Op.', 'Ingreso Bruto', 'Costo Fijo', 'Costo Variable', 'Utilidad Libre', 'Bolsa Generada'], mdata, 15, y, [20, 33, 27, 33, 39, 33], [1,2,3,4,5], [4]);

  footer(doc, pg++, totalPages);

  return { blob: doc.output('blob'), fileName: `${strip(branch.name).replace(/\s+/g,'_')}_Ejecutivo.pdf` };
}
