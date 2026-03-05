/**
 * 엑셀 "메리츠 보험사코드(영업자).xlsx" 기준으로 Supabase agents.branch 업데이트
 * - agents 테이블에 branch 컬럼이 없으면 마이그레이션으로 추가 후 업데이트
 * - E열: 설계사코드 (code)
 * - P열: branch
 *
 * 필요: .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY), xlsx
 * 컬럼 자동 추가: DATABASE_URL 또는 SUPABASE_DB_URL (Supabase Dashboard > Settings > Database > Connection string URI)
 * 실행: node scripts/supabase-update-branch-from-excel.js
 *       node scripts/supabase-update-branch-from-excel.js "C:\path\to\메리츠 보험사코드(영업자).xlsx"
 */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const MIGRATION_SQL = path.join(__dirname, 'migrations', 'add_branch_to_agents.sql');

const DEFAULT_EXCEL = path.join(__dirname, '..', '..', 'data', 'fix', '메리츠 보험사코드(영업자).xlsx');
const EXCEL_PATH = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_EXCEL;

// E열 = 설계사코드(0-based 4), P열 = branch(0-based 15)
const IDX_CODE = 4;
const IDX_BRANCH = 15;

function normalizeCode(c) {
  const s = String(c).trim();
  const n = Number(s);
  if (!isNaN(n) && n >= 0 && n < 1e15) return String(Math.round(n));
  return s;
}

/** DATABASE_URL가 있으면 pg로 branch 컬럼 추가. 없으면 SQL 안내만. */
async function ensureBranchColumn() {
  if (DATABASE_URL) {
    try {
      const { Client } = require('pg');
      const client = new Client({ connectionString: DATABASE_URL });
      await client.connect();
      await client.query('ALTER TABLE agents ADD COLUMN IF NOT EXISTS branch text;');
      await client.end();
      console.log('[Branch] agents.branch 컬럼 확인/추가 완료 (DB 연결 사용)');
      return true;
    } catch (err) {
      console.warn('[Branch] DB 연결로 컬럼 추가 실패:', err.message);
    }
  }
  const sqlPath = MIGRATION_SQL;
  if (fs.existsSync(sqlPath)) {
    const sql = fs.readFileSync(sqlPath, 'utf8').trim();
    console.log('[Branch] branch 컬럼이 없을 수 있습니다. Supabase Dashboard > SQL Editor에서 아래를 실행한 뒤 다시 실행하세요:\n');
    console.log(sql);
    console.log('');
  }
  return false;
}

function parseExcel(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('파일 없음:', filePath);
    process.exit(1);
  }
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let headerRow = 0;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const cell = String(row[IDX_CODE] ?? '').trim();
    if (cell === '설계사코드' || cell === '사용인코드' || (r > 0 && /^\d{5,}/.test(cell))) {
      headerRow = cell === '설계사코드' || cell === '사용인코드' ? r : 0;
      break;
    }
  }

  const result = new Map();
  const startRow = String(rows[headerRow]?.[IDX_CODE] ?? '').trim() === '설계사코드' || String(rows[headerRow]?.[IDX_CODE] ?? '').trim() === '사용인코드' ? headerRow + 1 : headerRow;
  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const codeRaw = row[IDX_CODE];
    const code = normalizeCode(codeRaw ?? '');
    if (!code || code.length < 4) continue;
    const branch = String(row[IDX_BRANCH] ?? '').trim();
    result.set(code, branch);
  }
  return result;
}

async function main() {
  await ensureBranchColumn();

  console.log('[Branch] 엑셀:', EXCEL_PATH);
  const codeToBranch = parseExcel(EXCEL_PATH);
  console.log('[Branch] 엑셀에서 읽은 설계사코드→branch 쌍:', codeToBranch.size, '건');

  if (codeToBranch.size === 0) {
    console.log('[Branch] 업데이트할 데이터 없음.');
    return;
  }

  let updated = 0;
  let notFound = 0;
  const BATCH = 100;
  const CONCURRENCY = 20;
  const codes = Array.from(codeToBranch.keys());

  for (let i = 0; i < codes.length; i += BATCH) {
    const chunk = codes.slice(i, i + BATCH);
    const { data: agents, error: fetchErr } = await supabase
      .from('agents')
      .select('id, code')
      .in('code', chunk);

    if (fetchErr) {
      const msg = (fetchErr.message || '').toLowerCase();
      if (msg.includes('branch') && (msg.includes('column') || msg.includes('does not exist'))) {
        console.error('[Branch] agents 테이블에 branch 컬럼이 없습니다.');
        if (fs.existsSync(MIGRATION_SQL)) {
          console.log('Supabase Dashboard > SQL Editor에서 아래 SQL 실행 후 다시 시도하세요:\n');
          console.log(fs.readFileSync(MIGRATION_SQL, 'utf8').trim());
          console.log('');
        }
        process.exit(1);
      }
      console.error('[Branch] 조회 오류:', fetchErr.message);
      throw fetchErr;
    }

    const byCode = new Map((agents || []).map((a) => [normalizeCode(a.code), a]));
    const updates = [];
    for (const code of chunk) {
      const branch = codeToBranch.get(code);
      const agent = byCode.get(code);
      if (!agent) {
        notFound++;
        continue;
      }
      updates.push({ id: agent.id, branch: branch || null });
    }

    for (let u = 0; u < updates.length; u += CONCURRENCY) {
      const group = updates.slice(u, u + CONCURRENCY);
      const results = await Promise.all(
        group.map(({ id, branch }) =>
          supabase.from('agents').update({ branch }).eq('id', id).then((r) => r.error)
        )
      );
      for (let k = 0; k < results.length; k++) {
        const err = results[k];
        if (err) {
          const msg = (err.message || '').toLowerCase();
          if (msg.includes('branch') && (msg.includes('column') || msg.includes('does not exist'))) {
            console.error('[Branch] agents 테이블에 branch 컬럼이 없습니다.');
            if (fs.existsSync(MIGRATION_SQL)) {
              console.log('Supabase Dashboard > SQL Editor에서 아래 SQL 실행 후 다시 시도하세요:\n');
              console.log(fs.readFileSync(MIGRATION_SQL, 'utf8').trim());
              console.log('');
            }
            process.exit(1);
          }
          console.error('[Branch] 업데이트 실패:', err.message);
        } else {
          updated++;
        }
      }
    }
    if ((i + BATCH) % 500 === 0 || i + BATCH >= codes.length) {
      console.log('[Branch] 진행:', Math.min(i + BATCH, codes.length), '/', codes.length);
    }
  }

  console.log('[Branch] 완료. 업데이트:', updated, '건, Supabase에 없는 코드:', notFound, '건');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
