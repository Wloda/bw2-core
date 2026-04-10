const XLSX = require('xlsx');
const workbook = XLSX.readFile('./docs/modelo PL PATIO SANTAFE.xlsx');
console.log('Sheets:', workbook.SheetNames);
for (const sheet of workbook.SheetNames) {
  console.log('---', sheet, '---');
  const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheet]);
  const lines = csv.split('\n').filter(l => l.replace(/,/g, '').trim().length > 0);
  console.log(lines.slice(0, 30).join('\n'));
}
