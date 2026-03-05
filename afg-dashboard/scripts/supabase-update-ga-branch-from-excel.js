/**
 * 엑셀 "메리츠 보험사코드(영업자).xlsx" 기준으로 Supabase agents.ga_branch 업데이트
 * - GA/대리점 지사명 전용 컬럼
 *
 * 매핑:
 * - E열(등록코드, 0-based 4): 설계사 코드
 * - P열(조직경로4, 0-based 15): 지점/대리점 지사명
 *
 * 규칙:
 * - P열 값이 "우리"를 포함하면 → ga_branch = "WOORI BRANCH"
 * - 그 외는 P열 원본 문자열 그대로 ga_branch에 저장
 *
 * 필요:
 * - .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 * - 옵션: DATABASE_URL 또는 SUPABASE_DB_URL (Postgres 연결 URI) → 있으면 ga_branch 컬럼 자동 생성
 *
 * 실행 예시:
 *   node scripts/supabase-update-ga-branch-from-excel.js
 *   node scripts/supabase-update-ga-branch-from-excel.js "C:\\Users\\chlgn\\OneDrive\\Desktop\\AFG_DASHBOARD\\data\\fix\\메리츠 보험사코드(영업자).xlsx"
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

const GA_MIGRATION_SQL = path.join(__dirname, 'migrations', 'add_ga_branch_to_agents.sql');

const DEFAULT_EXCEL = path.join(__dirname, '..', '..', 'data', 'fix', '메리츠 보험사코드(영업자).xlsx');
const EXCEL_PATH = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_EXCEL;

// E열 = 등록코드(설계사코드, 0-based 4), P열 = 조직경로4(지점/대리점 지사명, 0-based 15)
const IDX_CODE = 4;
const IDX_GA = 15;

function normalizeCode(c) {
  const s = String(c ?? '').trim();
  const n = Number(s);
  if (!isNaN(n) && n >= 0 && n < 1e15) return String(Math.round(n));
  return s;
}

/** DATABASE_URL가 있으면 pg로 ga_branch 컬럼 추가. 없으면 SQL 안내만. */
async function ensureGaBranchColumn() {
  if (DATABASE_URL) {
    try {
      const { Client } = require('pg');
      const client = new Client({ connectionString: DATABASE_URL });
      await client.connect();
      await client.query('ALTER TABLE agents ADD COLUMN IF NOT EXISTS ga_branch text;');
      await client.end();
      console.log('[GA] agents.ga_branch 컬럼 확인/추가 완료 (DB 연결 사용)');
      return true;
    } catch (err) {
      console.warn('[GA] DB 연결로 ga_branch 컬럼 추가 실패:', err.message);
    }
  }
  if (fs.existsSync(GA_MIGRATION_SQL)) {
    const sql = fs.readFileSync(GA_MIGRATION_SQL, 'utf8').trim();
    console.log('[GA] ga_branch 컬럼이 없을 수 있습니다. Supabase Dashboard > SQL Editor에서 아래를 실행한 뒤 다시 실행하세요:\n');
    console.log(sql);
    console.log('');
  }
  return false;
}

function parseGaExcel(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('파일 없음:', filePath);
    process.exit(1);
  }
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // 헤더는 2번째 인덱스 행(R2)로 고정 (R0 제목, R1 공백, R2 실제 헤더)
  const headerRow = 2;
  const header = rows[headerRow] || [];
  console.log(
    '[GA] 헤더:',
    header.map((v, i) => `${i}:${v}`).join(' | ')
  );

  const result = new Map();
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const codeRaw = row[IDX_CODE];
    const code = normalizeCode(codeRaw ?? '');
    if (!code || code.length < 4) continue;
    let gaRaw = String(row[IDX_GA] ?? '').trim();
    if (!gaRaw) continue;
    // "우리"가 포함된 지점은 WOORI BRANCH로 통일
    if (gaRaw.includes('우리') || gaRaw.toUpperCase().includes('WOORI')) {
      gaRaw = 'WOORI BRANCH';
    }
    result.set(code, gaRaw);
  }
  return result;
}

async function main() {
  await ensureGaBranchColumn();

  console.log('[GA] 엑셀:', EXCEL_PATH);
  const codeToGa = parseGaExcel(EXCEL_PATH);
  console.log('[GA] 엑셀에서 읽은 설계사코드→GA지사명 쌍:', codeToGa.size, '건');

  if (codeToGa.size === 0) {
    console.log('[GA] 업데이트할 데이터 없음.');
    return;
  }

  let updated = 0;
  let notFound = 0;
  const BATCH = 100;
  const CONCURRENCY = 20;
  const codes = Array.from(codeToGa.keys());

  for (let i = 0; i < codes.length; i += BATCH) {
    const chunk = codes.slice(i, i + BATCH);
    const { data: agents, error: fetchErr } = await supabase
      .from('agents')
      .select('id, code')
      .in('code', chunk);

    if (fetchErr) {
      console.error('[GA] 조회 오류:', fetchErr.message);
      throw fetchErr;
    }

    const byCode = new Map((agents || []).map((a) => [normalizeCode(a.code), a]));
    const updates = [];
    for (const code of chunk) {
      const gaBranch = codeToGa.get(code);
      const agent = byCode.get(code);
      if (!agent) {
        notFound++;
        continue;
      }
      updates.push({ id: agent.id, ga_branch: gaBranch || null });
    }

    for (let u = 0; u < updates.length; u += CONCURRENCY) {
      const group = updates.slice(u, u + CONCURRENCY);
      const results = await Promise.all(
        group.map(({ id, ga_branch }) =>
          supabase.from('agents').update({ ga_branch }).eq('id', id).then((r) => r.error)
        )
      );
      for (let k = 0; k < results.length; k++) {
        const err = results[k];
        if (err) {
          console.error('[GA] 업데이트 실패:', err.message);
        } else {
          updated++;
        }
      }
    }
    if ((i + BATCH) % 500 === 0 || i + BATCH >= codes.length) {
      console.log('[GA] 진행:', Math.min(i + BATCH, codes.length), '/', codes.length);
    }
  }

  console.log('[GA] 완료. 업데이트:', updated, '건, Supabase에 없는 코드:', notFound, '건');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

