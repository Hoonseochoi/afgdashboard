/**
 * 엑셀(보험사코드(영업자)_20260309-160200.xlsx) 기준으로 Supabase agents.sm 업데이트
 * - 설계사 코드: D열 (0-based 3)
 * - SM 값: M열 (0-based 12)
 *
 * 필요:
 * - .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, 선택: DATABASE_URL/SUPABASE_DB_URL)
 *
 * 실행 예시:
 *   node scripts/supabase-update-agent-sm-from-excel.js
 *   node scripts/supabase-update-agent-sm-from-excel.js "..\\data\\fix\\보험사코드(영업자)_20260309-160200.xlsx"
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

const SM_MIGRATION_SQL = path.join(__dirname, 'migrations', 'add_sm_to_agents.sql');

// 엑셀 경로: 인자로 주면 그 파일, 아니면 data/fix 기본 파일
const ARG_PATH = process.argv[2];
const DEFAULT_EXCEL_PATH = path.join(__dirname, '..', '..', 'data', 'fix', '보험사코드(영업자)_20260309-160200.xlsx');
const EXCEL_PATH = ARG_PATH ? path.resolve(ARG_PATH) : DEFAULT_EXCEL_PATH;

// D열 = 설계사 코드(0-based 3), M열 = SM (0-based 12)
const IDX_CODE = 3;
const IDX_SM = 12;
const HEADER_ROW = 0;

function normalizeCode(c) {
  const s = String(c ?? '').trim();
  if (!s) return '';
  const n = Number(s.replace(/[,\s]/g, ''));
  if (!isNaN(n) && n >= 0 && n < 1e15) return String(Math.round(n));
  return s;
}

/** DATABASE_URL가 있으면 pg로 sm 컬럼 추가. 없으면 SQL 안내만. */
async function ensureSmColumn() {
  if (DATABASE_URL) {
    try {
      const { Client } = require('pg');
      const client = new Client({ connectionString: DATABASE_URL });
      await client.connect();
      await client.query('ALTER TABLE agents ADD COLUMN IF NOT EXISTS sm text;');
      await client.end();
      console.log('[sm] agents.sm 컬럼 확인/추가 완료 (DB 연결 사용)');
      return true;
    } catch (err) {
      console.warn('[sm] DB 연결로 sm 컬럼 추가 실패:', err.message);
    }
  }
  if (fs.existsSync(SM_MIGRATION_SQL)) {
    const sql = fs.readFileSync(SM_MIGRATION_SQL, 'utf8').trim();
    console.log('[sm] sm 컬럼이 없을 수 있습니다. Supabase Dashboard > SQL Editor에서 아래를 실행한 뒤 다시 실행하세요:\n');
    console.log(sql);
    console.log('');
  }
  return false;
}

function parseSmExcel(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('SM 엑셀 파일을 찾을 수 없습니다:', filePath);
    process.exit(1);
  }
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const header = rows[HEADER_ROW] || [];
  console.log(
    '[SM/EXCEL] 헤더(일부):',
    header.slice(0, 20).map((v, i) => `${i}:${v}`).join(' | ')
  );

  const result = new Map();
  for (let r = HEADER_ROW + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const codeRaw = row[IDX_CODE];
    const smRaw = row[IDX_SM];
    const code = normalizeCode(codeRaw);
    const sm = smRaw != null ? String(smRaw).trim() : '';
    if (!code || !sm) continue;
    result.set(code, sm); // 같은 코드가 여러 번 나오면 마지막 값으로 덮어씀
  }
  return result;
}

async function main() {
  await ensureSmColumn();

  console.log('[SM/EXCEL] 엑셀:', EXCEL_PATH);
  const codeToSm = parseSmExcel(EXCEL_PATH);
  console.log('[SM/EXCEL] 엑셀에서 읽은 설계사코드→SM 쌍:', codeToSm.size, '건');

  if (codeToSm.size === 0) {
    console.log('[SM/EXCEL] 업데이트할 데이터 없음.');
    return;
  }

  let updated = 0;
  let notFound = 0;
  const BATCH = 100;
  const CONCURRENCY = 20;
  const codes = Array.from(codeToSm.keys());

  for (let i = 0; i < codes.length; i += BATCH) {
    const chunk = codes.slice(i, i + BATCH);
    const { data: agents, error: fetchErr } = await supabase
      .from('agents')
      .select('id, code')
      .in('code', chunk);

    if (fetchErr) {
      console.error('[SM/EXCEL] 조회 오류:', fetchErr.message);
      throw fetchErr;
    }

    const byCode = new Map((agents || []).map((a) => [normalizeCode(a.code), a]));
    const updates = [];
    for (const code of chunk) {
      const sm = codeToSm.get(code);
      const agent = byCode.get(code);
      if (!agent) {
        notFound++;
        continue;
      }
      updates.push({ id: agent.id, sm });
    }

    for (let u = 0; u < updates.length; u += CONCURRENCY) {
      const group = updates.slice(u, u + CONCURRENCY);
      const results = await Promise.all(
        group.map(({ id, sm }) =>
          supabase.from('agents').update({ sm }).eq('id', id).then((r) => r.error)
        )
      );
      for (let k = 0; k < results.length; k++) {
        const err = results[k];
        if (err) {
          console.error('[SM/EXCEL] 업데이트 실패:', err.message);
        } else {
          updated++;
        }
      }
    }

    if ((i + BATCH) % 500 === 0 || i + BATCH >= codes.length) {
      console.log('[SM/EXCEL] 진행:', Math.min(i + BATCH, codes.length), '/', codes.length);
    }
  }

  console.log('[SM/EXCEL] 완료. 업데이트:', updated, '건, Supabase에 없는 코드:', notFound, '건');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

