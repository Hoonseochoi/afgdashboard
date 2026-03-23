require('dotenv').config({ path: require('path').join(__dirname, '.env.local') });
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function main() {
  const EXCEL_PATH = path.join(__dirname, '../data/daily/0323MC_LIST_OUT.xlsx');
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: 0 });

  console.log(`Excel read: ${rows.length} rows`);

  const excelAgents = new Map();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    let code = String(row[5] ?? '').trim();
    if (!code || code.length < 5) continue;
    const n = Number(code);
    if (!isNaN(n) && n >= 0) code = String(Math.round(n));

    excelAgents.set(code, {
      code,
      name: String(row[6] ?? '').trim() || code,
      branch: String(row[37] ?? '').trim()
    });
  }

  console.log(`Unique agents in Excel: ${excelAgents.size}`);

  let dbAgents = [];
  let offset = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase.from('agents').select('code, branch').range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const d of data) {
      let code = String(d.code).trim();
      const n = Number(code);
      if (!isNaN(n) && n >= 0) code = String(Math.round(n));
      dbAgents.push({ code, dbBranch: d.branch });
    }
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(`Agents in DB: ${dbAgents.length}`);

  let matchInExcel = 0;
  let missingFromExcel = 0;
  let matchDifferentBranch = 0;

  for (const d of dbAgents) {
    if (excelAgents.has(d.code)) {
      matchInExcel++;
      const ea = excelAgents.get(d.code);
      if (!ea.branch.includes('어센틱')) {
        matchDifferentBranch++;
      }
    } else {
      missingFromExcel++;
    }
  }

  const out = `DB agents found in Excel: ${matchInExcel}
DB agents NOT found in Excel: ${missingFromExcel}
DB agents found in Excel but branch is NOT '어센틱': ${matchDifferentBranch}`;
  console.log(out);
  require('fs').writeFileSync('output2.txt', out, 'utf8');
}

main().catch(console.error);
