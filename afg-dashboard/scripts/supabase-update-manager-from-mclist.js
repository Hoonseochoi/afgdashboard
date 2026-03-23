/**
 * MC_LIST_OUT 엑셀 E열(매니저명) 기준으로 Supabase agents.manager_name 전체 재매칭 후 덮어쓰기
 * - 대리점명(AL열)이 "어센틱"인 행만 대상
 * - 코드: F열(현재대리점설계사조직코드, 0-based 5)
 * - E열(0-based 4): 매니저명 → manager_name
 *
 * 필요: .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 * 실행: node scripts/supabase-update-manager-from-mclist.js [엑셀경로]
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

// E열 = 매니저명(0-based 4), F열 = 코드(0-based 5), AL열 = 지사명(0-based 37)
const IDX_MANAGER = 4;
const IDX_CODE = 5;
const IDX_BRANCH = 37;

function normalizeCode(c) {
  const s = String(c).trim();
  const n = Number(s);
  if (!isNaN(n) && n >= 0 && n < 1e15) return String(Math.round(n));
  return s;
}

function parseMcListManager(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('MC_LIST 파일을 찾을 수 없습니다:', filePath);
    process.exit(1);
  }
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const headerRow = 1;
  const header = rows[headerRow] || [];
  console.log('[manager_name/MCLIST] E열(매니저명) 인덱스:', IDX_MANAGER, '헤더:', header[IDX_MANAGER] || '(없음)');

  const result = new Map();
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const branchRaw = String(row[IDX_BRANCH] ?? '').trim();
    if (!branchRaw.includes('어센틱')) continue;
    const codeRaw = row[IDX_CODE];
    const code = normalizeCode(codeRaw ?? '');
    if (!code || code.length < 4) continue;
    const managerRaw = row[IDX_MANAGER];
    const manager = managerRaw != null ? String(managerRaw).trim() : '';
    result.set(code, manager || null);
  }
  return result;
}

async function main() {
  console.log('[manager_name/MCLIST] 엑셀:', EXCEL_PATH);
  const codeToManager = parseMcListManager(EXCEL_PATH);
  console.log('[manager_name/MCLIST] 엑셀에서 읽은 설계사코드→매니저명 쌍:', codeToManager.size, '건');

  if (codeToManager.size === 0) {
    console.log('[manager_name/MCLIST] 업데이트할 데이터 없음.');
    return;
  }

  const BATCH = 100;
  const CONCURRENCY = 20;
  const codes = Array.from(codeToManager.keys());
  let updated = 0;
  let notFound = 0;

    for (let i = 0; i < codes.length; i += BATCH) {
      const chunk = codes.slice(i, i + BATCH);
      const { data: agents, error: fetchErr } = await supabase
        .from('agents')
        .select('id, code, manager_name')
        .in('code', chunk);
  
      if (fetchErr) {
        console.error('[manager_name/MCLIST] 조회 오류:', fetchErr.message);
        throw fetchErr;
      }
  
      const byCode = new Map((agents || []).map((a) => [normalizeCode(a.code), a]));
      const updates = [];
      for (const code of chunk) {
        const managerName = codeToManager.get(code);
        const agent = byCode.get(code);
        if (!agent) {
          notFound++;
          continue;
        }
        if (agent.manager_name !== managerName) {
            console.log(`[변경됨] 설계사 ${code}: 기존 '${agent.manager_name}' -> 변경 '${managerName}'`);
            updates.push({ id: agent.id, manager_name: managerName });
        }
      }
  
      for (let u = 0; u < updates.length; u += CONCURRENCY) {
        const group = updates.slice(u, u + CONCURRENCY);
        const results = await Promise.all(
          group.map(({ id, manager_name }) =>
            supabase.from('agents').update({ manager_name }).eq('id', id).then((r) => r.error)
          )
        );
        for (let k = 0; k < results.length; k++) {
          const err = results[k];
          if (err) {
            console.error('[manager_name/MCLIST] 업데이트 실패 id:', group[k].id, err.message);
          } else {
            updated++;
          }
        }
      }
      if ((i + BATCH) % 500 === 0 || i + BATCH >= codes.length) {
        console.log('[manager_name/MCLIST] 진행:', Math.min(i + BATCH, codes.length), '/', codes.length);
      }
    }
  
    console.log('[manager_name/MCLIST] 완료. 실제 업데이트된 갯수:', updated, '건, Supabase에 없어서 무시된 엑셀 코드 수:', notFound, '건');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
