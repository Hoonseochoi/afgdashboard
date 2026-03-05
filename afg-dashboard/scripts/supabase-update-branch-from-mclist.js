/**
 * MC_LIST_OUT 엑셀(`data/daily/NNNNMC_LIST_OUT_YYYYMM.xlsx`) 기준으로 Supabase agents.branch 업데이트
 * - 코드: F열(현재대리점설계사조직코드, 0-based 5)
 * - 지사/스튜디오명: AL열(현재대리점지사명, 0-based 37)
 *
 * 필요:
 * - .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 * - data/daily 폴더에 MC_LIST_OUT 엑셀 존재
 *
 * 실행 예시:
 *   node scripts/supabase-update-branch-from-mclist.js
 *   node scripts/supabase-update-branch-from-mclist.js "..\\data\\daily\\0305MC_LIST_OUT_202603.xlsx"
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

// MC_LIST 파일 경로 결정: 인자로 주면 그 파일, 아니면 data/daily 내 최신 NNNNMC_LIST*.xlsx
function findLatestDailyMcList() {
  const dailyDir = path.join(__dirname, '..', '..', 'data', 'daily');
  if (!fs.existsSync(dailyDir)) return null;
  const files = fs
    .readdirSync(dailyDir)
    .filter((f) => /^\d{4}MC_LIST/i.test(f) && /\.xlsx?$/i.test(f))
    .sort();
  if (files.length === 0) return null;
  return path.join(dailyDir, files[files.length - 1]);
}

const ARG_PATH = process.argv[2];
const EXCEL_PATH = ARG_PATH ? path.resolve(ARG_PATH) : findLatestDailyMcList();

// F열 = 코드(현재대리점설계사조직코드, 0-based 5), AL열 = 현재대리점지사명(0-based 37)
const IDX_CODE = 5;
const IDX_BRANCH = 37;

function normalizeCode(c) {
  const s = String(c).trim();
  const n = Number(s);
  if (!isNaN(n) && n >= 0 && n < 1e15) return String(Math.round(n));
  return s;
}

function parseMcList(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('MC_LIST 파일을 찾을 수 없습니다:', filePath);
    process.exit(1);
  }
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // 헤더는 1번째 인덱스 행(R1)로 고정 (R0은 1,2,3,... 인덱스)
  const headerRow = 1;
  const header = rows[headerRow] || [];
  console.log(
    '[Branch/MCLIST] 헤더:',
    header.map((v, i) => `${i}:${v}`).join(' | ')
  );

  const result = new Map();
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const codeRaw = row[IDX_CODE];
    const code = normalizeCode(codeRaw ?? '');
    if (!code || code.length < 4) continue;
    const branchRaw = String(row[IDX_BRANCH] ?? '').trim();
    if (!branchRaw) continue;
    result.set(code, branchRaw);
  }
  return result;
}

async function main() {
  console.log('[Branch/MCLIST] 엑셀:', EXCEL_PATH);
  const codeToBranch = parseMcList(EXCEL_PATH);
  console.log('[Branch/MCLIST] 엑셀에서 읽은 설계사코드→지사명 쌍:', codeToBranch.size, '건');

  if (codeToBranch.size === 0) {
    console.log('[Branch/MCLIST] 업데이트할 데이터 없음.');
    return;
  }

  let updated = 0;
  let notFound = 0;
  const BATCH = 100;
  const CONCURRENCY = 20;

  // Supabase에서 branch가 '우리'인 설계사만 대상으로 한정
  const { data: ours, error: oursErr } = await supabase
    .from('agents')
    .select('id, code, branch')
    .ilike('branch', '%우리%');
  if (oursErr) {
    console.error('[Branch/MCLIST] 우리 브랜치 조회 오류:', oursErr.message);
    process.exit(1);
  }
  if (!ours || ours.length === 0) {
    console.log('[Branch/MCLIST] branch에 \"우리\"가 포함된 설계사가 없습니다. 종료.');
    return;
  }
  const targetCodes = ours.map((a) => normalizeCode(a.code));
  console.log('[Branch/MCLIST] 우리 브랜치 대상 설계사 수:', targetCodes.length);

  const codes = targetCodes;

  for (let i = 0; i < codes.length; i += BATCH) {
    const chunk = codes.slice(i, i + BATCH);
    const { data: agents, error: fetchErr } = await supabase
      .from('agents')
      .select('id, code')
      .in('code', chunk);

    if (fetchErr) {
      console.error('[Branch/MCLIST] 조회 오류:', fetchErr.message);
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
          console.error('[Branch/MCLIST] 업데이트 실패:', err.message);
        } else {
          updated++;
        }
      }
    }
    if ((i + BATCH) % 500 === 0 || i + BATCH >= codes.length) {
      console.log('[Branch/MCLIST] 진행:', Math.min(i + BATCH, codes.length), '/', codes.length);
    }
  }

  console.log('[Branch/MCLIST] 완료. 업데이트:', updated, '건, Supabase에 없는 코드:', notFound, '건');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

