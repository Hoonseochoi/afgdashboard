/**
 * Supabase 일일(0227 등) 반영
 * - data/daily 폴더의 최신 NNNNMC_LIST*.xlsx 파싱
 * - config (key=app) update_date 갱신
 * - agents 테이블에 당월/전월 실적, 주차 실적 merge
 * - src/data/agent-order.json 저장 (MC_LIST 순서)
 *
 * 필요: .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY), xlsx
 * 실행: node scripts/supabase-upload-daily.js
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

// 고정 인덱스 (0-based). docs/DAILY_EXCEL_MAPPING.md 기준: F=5, G=6, K=10, S=18, U~X=20~23, AL=37
const IDX_CODE = 5;
const IDX_NAME = 6;
const IDX_CURRENT = 10;
const IDX_PREV = 18;
const IDX_W1 = 20;
const IDX_W2 = 21;
const IDX_W3 = 22;
const IDX_W4 = 23;
const IDX_BRANCH = 37;
const HEADER_ROW = 1;

function findLatestTwoDailyFiles() {
  const dailyDir = path.join(__dirname, '..', '..', 'data', 'daily');
  if (!fs.existsSync(dailyDir)) return { latest: null, prev: null };
  const files = fs.readdirSync(dailyDir)
    .filter((f) => /^\d{4}MC_LIST/i.test(f) && /\.xlsx?$/i.test(f))
    .sort();
  if (files.length === 0) return { latest: null, prev: null };
  const latest = files[files.length - 1];
  const latestNum = parseInt(latest.slice(0, 4), 10);
  const prevPrefix = Number.isFinite(latestNum) ? String(latestNum - 1).padStart(4, '0') : null;
  const prev = prevPrefix ? (files.find((f) => f.startsWith(prevPrefix)) || null) : null;
  return {
    latest: path.join(dailyDir, latest),
    prev: prev ? path.join(dailyDir, prev) : null,
  };
}

function parseMonthFromFilename(filename) {
  const match = filename.match(/_(\d{6})\.xlsx?$/i) || filename.match(/(\d{6})\.xlsx?$/i);
  if (!match) return { current: '2026-02', prev: '2026-01' };
  const ym = match[1];
  const y = ym.slice(0, 4);
  const m = parseInt(ym.slice(4), 10);
  const current = `${y}-${String(m).padStart(2, '0')}`;
  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? String(parseInt(y, 10) - 1) : y;
  const prev = `${prevY}-${String(prevM).padStart(2, '0')}`;
  return { current, prev };
}

function parseDailyXlsx(filePath, opts = {}) {
  const { logColumns = false } = opts;
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: 0 });
  const headerRow = HEADER_ROW;
  if (logColumns) {
    const h = rows[headerRow] || [];
    console.log('  [파싱] 고정 인덱스 | 헤더 행:', headerRow, '| 코드:', IDX_CODE, '이름:', IDX_NAME, '인정실적:', IDX_CURRENT, '전월:', IDX_PREV, '지사:', IDX_BRANCH);
  }
  const result = [];
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const branch = String(row[IDX_BRANCH] ?? '').trim();
    if (!branch.includes('어센틱')) continue;
    const code = String(row[IDX_CODE] ?? '').trim();
    if (!code || code.length < 5) continue;
    const name = String(row[IDX_NAME] ?? '').trim() || code;
    const rawCurrent = row[IDX_CURRENT];
    const currentMonth = Number(rawCurrent) || (typeof rawCurrent === 'string' ? Number(String(rawCurrent).replace(/[,\s]/g, '')) || 0 : 0);
    const prevMonth = Number(row[IDX_PREV]) || 0;
    const rawW1 = row[IDX_W1];
    const week1 = Number(rawW1) || (typeof rawW1 === 'string' ? Number(String(rawW1).replace(/[,\s]/g, '')) || 0 : 0);
    const week2 = Number(row[IDX_W2]) || 0;
    const week3 = Number(row[IDX_W3]) || 0;
    const week4 = Number(row[IDX_W4]) || 0;
    result.push({ code, name, branch, currentMonth, prevMonth, week1, week2, week3, week4 });
  }
  return result;
}

const BATCH_FETCH_SIZE = 300;
const BATCH_UPSERT_SIZE = 100;
const PAGE_SIZE = 1000;

/** 엑셀/DB 코드 형식 통일 (앞자리 0 제거, 숫자면 문자열로). 매칭용 */
function normalizeCode(c) {
  const s = String(c).trim();
  const n = Number(s);
  if (!isNaN(n) && n >= 0 && n < 1e15) return String(Math.round(n));
  return s;
}

/** DB agents 전부 페이지 단위로 조회 → normalizedCode -> { code(실제 DB값), performance, weekly } 맵 */
async function fetchAllAgentsMap() {
  const agentByCode = new Map();
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase
      .from('agents')
      .select('code, performance, weekly')
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      const key = normalizeCode(row.code);
      agentByCode.set(key, { code: String(row.code), performance: row.performance, weekly: row.weekly });
    }
    hasMore = data.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }
  return agentByCode;
}

async function main() {
  const files = findLatestTwoDailyFiles();
  const filePath = files.latest;
  if (!filePath) {
    console.error('  data/daily 폴더에 NNNNMC_LIST*.xlsx 파일이 없습니다.');
    process.exit(1);
  }
  const fileName = path.basename(filePath);
  const updateDate = fileName.substring(0, 4);
  const { current: currentMonthKey, prev: prevMonthKey } = parseMonthFromFilename(fileName);
  console.log('[Supabase Daily] 파일:', fileName, '→ updateDate:', updateDate, '당월:', currentMonthKey, '전월:', prevMonthKey);

  const rows = parseDailyXlsx(filePath, { logColumns: true });
  console.log('  어센틱금융그룹 설계사', rows.length, '명 파싱됨');

  let prevMap = new Map();
  if (files.prev) {
    try {
      const prevRows = parseDailyXlsx(files.prev, {});
      prevMap = new Map(prevRows.map((r) => [normalizeCode(r.code), r]));
    } catch (e) {
      console.error('  전일 파일 파싱 중 오류(무시):', e);
    }
  }

  const { error: configErr } = await supabase.from('config').upsert({ key: 'app', update_date: updateDate }, { onConflict: 'key' });
  if (configErr) {
    console.error('  config 갱신 실패:', configErr.message);
    process.exit(1);
  }
  console.log('  config.app.update_date =', updateDate);

  console.log('  기존 agents 전량 조회 중...');
  const agentByCode = await fetchAllAgentsMap();
  console.log('  기존 데이터', agentByCode.size, '명 로드됨');

  const dailyDiffKey = `${currentMonthKey}-diff`;
  const orderedCodes = [];
  const toUpdate = [];
  const toInsert = [];

  const DEBUG_CODES = ['725070184'];
  for (const row of rows) {
    const codeNorm = normalizeCode(row.code);
    const codeStr = String(row.code).trim();
    orderedCodes.push(codeNorm);
    const prevRow = prevMap.get(codeNorm);
    const prevCurrent = prevRow ? prevRow.currentMonth : row.currentMonth;
    const dailyDiff = row.currentMonth - prevCurrent;

    if (DEBUG_CODES.includes(codeNorm)) {
      console.log('  [디버그]', codeNorm, '엑셀 인정실적(당월):', row.currentMonth, '원');
    }

    const existing = agentByCode.get(codeNorm);
    const performance = { ...(existing?.performance || {}) };
    performance[currentMonthKey] = row.currentMonth;
    performance[prevMonthKey] = row.prevMonth;
    performance[dailyDiffKey] = dailyDiff;
    const weekly = { week1: row.week1, week2: row.week2, week3: row.week3, week4: row.week4 };

    if (existing) {
      toUpdate.push({ code: existing.code, performance, weekly });
    } else {
      toInsert.push({
        code: codeNorm,
        name: String(row.name || ''),
        branch: String(row.branch || ''),
        password: codeNorm,
        role: 'agent',
        is_first_login: true,
        performance,
        weekly,
        manager_code: null,
        manager_name: null,
        target_manager_code: null,
      });
    }
  }

  console.log('  → update 대상:', toUpdate.length, '명, insert 대상:', toInsert.length, '명');

  const CONCURRENT = 80;
  let updated = 0;
  let created = 0;

  if (toUpdate.length > 0) {
    const first = toUpdate[0];
    const testResult = await supabase.from('agents').update({ performance: first.performance, weekly: first.weekly }).eq('code', first.code).select('code, performance');
    if (testResult.error) {
      console.error('  [검증] 첫 update 실패:', first.code, testResult.error.message, testResult.error);
    } else {
      console.log('  [검증] 첫 update 성공:', first.code, '→ performance 키:', Object.keys(first.performance || {}).slice(0, 5).join(', '));
    }
  }

  for (let i = 0; i < toUpdate.length; i += CONCURRENT) {
    const batch = toUpdate.slice(i, i + CONCURRENT);
    const results = await Promise.all(
      batch.map(({ code, performance, weekly }) =>
        supabase.from('agents').update({ performance, weekly }).eq('code', String(code)).select('code')
      )
    );
    const failed = results.filter((r) => r.error);
    const noRow = results.filter((r) => !r.error && (!r.data || r.data.length === 0));
    if (failed.length) {
      failed.forEach((r, idx) => console.error('  update 실패:', batch[idx]?.code, r.error?.message));
    }
    if (noRow.length > 0 && i === 0) {
      console.warn('  [경고] 일부 update가 0건 반영됨 (code 불일치?) 샘플:', batch[0]?.code);
    }
    updated += batch.length - failed.length;
    if ((i + batch.length) % 400 === 0 || i + batch.length === toUpdate.length) {
      console.log('  update', Math.min(i + CONCURRENT, toUpdate.length), '/', toUpdate.length);
    }
  }

  for (let i = 0; i < toInsert.length; i += BATCH_UPSERT_SIZE) {
    const chunk = toInsert.slice(i, i + BATCH_UPSERT_SIZE);
    const { data, error: err } = await supabase.from('agents').insert(chunk).select('code');
    if (err) {
      console.error('  insert 청크 실패 (offset', i, '):', err.message, err.details || '');
    } else {
      created += (data && data.length) || chunk.length;
    }
  }

  if (toUpdate.length > 0) {
    const checkCode = toUpdate[0].code;
    const { data: after } = await supabase.from('agents').select('code, performance').eq('code', checkCode).single();
    if (after && after.performance && after.performance[currentMonthKey] != null) {
      console.log('  [검증] 반영 확인 OK:', checkCode, '당월 실적:', after.performance[currentMonthKey]);
    } else {
      console.warn('  [검증] 반영 확인 실패:', checkCode, '- DB에 해당 월 실적 없음');
    }
  }

  const seen = new Set();
  const codesForOrder = [];
  for (const c of orderedCodes) {
    if (seen.has(c)) continue;
    seen.add(c);
    const row = agentByCode.get(c);
    codesForOrder.push(row ? row.code : c);
  }
  for (const [normCode, row] of agentByCode) {
    if (seen.has(normCode)) continue;
    codesForOrder.push(row.code);
  }
  const orderPath = path.join(__dirname, '..', 'src', 'data', 'agent-order.json');
  fs.writeFileSync(orderPath, JSON.stringify({ updateDate, codes: codesForOrder }, null, 2), 'utf8');
  const dbOnlyCount = codesForOrder.length - seen.size;
  if (dbOnlyCount > 0) {
    console.log('  agent-order.json 저장 (MC_LIST', seen.size, '명 + DB전용', dbOnlyCount, '명 =', codesForOrder.length, '명)');
  } else {
    console.log('  agent-order.json 저장 (MC_LIST 순서,', codesForOrder.length, '명)');
  }
  console.log('[Supabase Daily] 완료. updateDate:', updateDate, '실적 반영:', updated, '건, 신규 생성:', created);
  return updateDate;
}

main().then(async (updateDate) => {
  // Push 알림 발송 (업로드 완료 시)
  if (!updateDate) return;
  const PUSH_API_SECRET = process.env.PUSH_API_SECRET || '';
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://afg-dashboard.vercel.app';
  if (!PUSH_API_SECRET) {
    console.log('[Push] PUSH_API_SECRET 없음 - push 발송 건너뜀');
    return;
  }
  try {
    // MM.DD 포맷
    const dateParts = String(updateDate).split('-'); // "2026-03-20" → ["2026","03","20"]
    const mmdd = dateParts.length >= 3 ? `${dateParts[1]}.${dateParts[2]}` : updateDate;
    const title = `${mmdd} 데이터 업로드 완료!`;
    const body = '지금 여기를 눌러 시상금을 확인하세요!';
    const res = await fetch(`${APP_URL}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, apiKey: PUSH_API_SECRET }),
    });
    const result = await res.json();
    if (result.ok) {
      console.log(`[Push] 발송 완료: ${result.sent}/${result.total}명`);
    } else {
      console.warn('[Push] 발송 실패:', result.error);
    }
  } catch (e) {
    console.warn('[Push] 발송 오류:', e.message);
  }
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
