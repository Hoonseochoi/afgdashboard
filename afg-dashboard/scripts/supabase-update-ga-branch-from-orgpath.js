/**
 * 엑셀 "보험사코드(영업자)_20260309-160200.xlsx" 기준으로 Supabase agents.ga_branch 업데이트
 * - D열(조직코드, 0-based 3): 설계사 코드 → agents.code 매칭
 * - L열(조직경로4, 0-based 11): ga_branch에 배치
 *
 * 필요:
 * - .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 *
 * 실행 예시:
 *   node scripts/supabase-update-ga-branch-from-orgpath.js
 *   node scripts/supabase-update-ga-branch-from-orgpath.js "C:\Users\chlgn\OneDrive\Desktop\AFG_DASHBOARD\data\fix\보험사코드(영업자)_20260309-160200.xlsx"
 */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const DEFAULT_EXCEL_PATH = path.join(__dirname, '..', '..', 'data', 'fix', '보험사코드(영업자)_20260309-160200.xlsx');
const EXCEL_PATH = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_EXCEL_PATH;

// D열 = 조직코드(0-based 3), L열 = 조직경로4(0-based 11)
const IDX_CODE = 3;
const IDX_ORGPATH4 = 11;
const HEADER_ROW = 0;

function normalizeCode(c) {
  const s = String(c ?? '').trim();
  if (!s) return '';
  const n = Number(s.replace(/[,\s]/g, ''));
  if (!isNaN(n) && n >= 0 && n < 1e15) return String(Math.round(n));
  return s;
}

function parseExcel(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('엑셀 파일을 찾을 수 없습니다:', filePath);
    process.exit(1);
  }
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const header = rows[HEADER_ROW] || [];
  console.log(
    '[ga_branch/EXCEL] 헤더(일부):',
    header.slice(0, 15).map((v, i) => `${i}:${v}`).join(' | ')
  );

  const result = new Map();
  for (let r = HEADER_ROW + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const codeRaw = row[IDX_CODE];
    const orgPath4 = row[IDX_ORGPATH4];
    const code = normalizeCode(codeRaw);
    const gaBranch = orgPath4 != null ? String(orgPath4).trim() : '';
    if (!code) continue;
    result.set(code, gaBranch); // 같은 코드가 여러 번 나오면 마지막 값으로 덮어씀
  }
  return result;
}

async function main() {
  console.log('[ga_branch/EXCEL] 엑셀:', EXCEL_PATH);
  const codeToGaBranch = parseExcel(EXCEL_PATH);
  console.log('[ga_branch/EXCEL] 엑셀에서 읽은 조직코드(D)→조직경로4(L) 쌍:', codeToGaBranch.size, '건');

  if (codeToGaBranch.size === 0) {
    console.log('[ga_branch/EXCEL] 업데이트할 데이터 없음.');
    return;
  }

  let updated = 0;
  let notFound = 0;
  const BATCH = 100;
  const CONCURRENCY = 20;
  const codes = Array.from(codeToGaBranch.keys());

  for (let i = 0; i < codes.length; i += BATCH) {
    const chunk = codes.slice(i, i + BATCH);
    const { data: agents, error: fetchErr } = await supabase
      .from('agents')
      .select('id, code')
      .in('code', chunk);

    if (fetchErr) {
      console.error('[ga_branch/EXCEL] 조회 오류:', fetchErr.message);
      throw fetchErr;
    }

    const byCode = new Map((agents || []).map((a) => [normalizeCode(a.code), a]));
    const updates = [];
    for (const code of chunk) {
      const gaBranch = codeToGaBranch.get(code);
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
          console.error('[ga_branch/EXCEL] 업데이트 실패:', err.message);
        } else {
          updated++;
        }
      }
    }

    if ((i + BATCH) % 500 === 0 || i + BATCH >= codes.length) {
      console.log('[ga_branch/EXCEL] 진행:', Math.min(i + BATCH, codes.length), '/', codes.length);
    }
  }

  console.log('[ga_branch/EXCEL] 완료. 업데이트:', updated, '건, Supabase에 없는 코드:', notFound, '건');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
