/**
 * 1주차·2주차 상품 실적 업로드 (PRIZE_SUM 엑셀)
 * - 파일: data/daily/{MMDD}PRIZE_SUM*.xlsx (예: 0305PRIZE_SUM_OUT_202603.xlsx)
 *   인자로 경로 지정 시 해당 파일 사용, 없으면 daily 폴더에서 최신 NNNNPRIZE_SUM*.xlsx 자동 선택
 * - K열(10): 설계사코드, AC열(28): 상품 1주차 실적, AH열(33): 상품 2주차 실적
 * - agents.product_week1, product_week2 + agents.weekly.productWeek1, productWeek2 반영
 *
 * 실행: node scripts/supabase-upload-march-product-week1.js [경로]
 * 데일리 업데이트: run-daily-update.py 에서 MC_LIST 업로드 후 함께 실행됨
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

const IDX_CODE = 10;   // K열: 설계사코드
const IDX_PRODUCT_W1 = 28; // AC열: 상품 1주차 실적
const IDX_PRODUCT_W2 = 33; // AH열: 상품 2주차 실적
const HEADER_ROW = 0; // 데이터 시작 전 헤더(있으면 0 또는 1)

const DAILY_DIR = path.join(__dirname, '..', '..', 'data', 'daily');

/** 인자로 경로가 있으면 사용, 없으면 data/daily에서 최신 NNNNPRIZE_SUM*.xlsx 선택 */
function resolveExcelPath() {
  const arg = process.argv[2];
  if (arg) {
    const p = path.isAbsolute(arg) ? arg : path.join(DAILY_DIR, path.basename(arg));
    return fs.existsSync(p) ? p : null;
  }
  if (!fs.existsSync(DAILY_DIR)) return null;
  const files = fs.readdirSync(DAILY_DIR)
    .filter((f) => /^\d{4}PRIZE_SUM/i.test(f) && /\.xlsx?$/i.test(f))
    .sort();
  if (files.length === 0) return null;
  return path.join(DAILY_DIR, files[files.length - 1]);
}

function normalizeCode(c) {
  const s = String(c).trim();
  const n = Number(s);
  if (!isNaN(n) && n >= 0 && n < 1e15) return String(Math.round(n));
  return s;
}

function parsePrizeSumXlsx(filePath) {
  const XLSX = require('xlsx');
  if (!fs.existsSync(filePath)) {
    console.error('파일 없음:', filePath);
    return null;
  }
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: 0 });
  const result = [];
  for (let r = HEADER_ROW + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const code = String(row[IDX_CODE] ?? '').trim();
    if (!code || code.length < 5) continue;
    const raw1 = row[IDX_PRODUCT_W1];
    const raw2 = row[IDX_PRODUCT_W2];
    const toNum = (raw) => Number(raw) || (typeof raw === 'string' ? Number(String(raw).replace(/[,\s]/g, '')) || 0 : 0);
    const productWeek1 = toNum(raw1);
    const productWeek2 = toNum(raw2);
    result.push({ code: normalizeCode(code), codeRaw: String(code).trim(), productWeek1, productWeek2 });
  }
  return result;
}

const PAGE_SIZE = 1000;

async function fetchAllAgentsMap() {
  const agentByCode = new Map();
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase
      .from('agents')
      .select('code, weekly, product_week1, product_week2')
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      const key = normalizeCode(row.code);
      agentByCode.set(key, { code: String(row.code), weekly: row.weekly || {}, product_week1: row.product_week1, product_week2: row.product_week2 });
    }
    hasMore = data.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }
  return agentByCode;
}

/** 업데이트 패치 생성 (weekly + product_week1 + product_week2) */
function getUpdatePayload(agentByCode, rows) {
  const toUpdate = [];
  for (const row of rows) {
    const existing = agentByCode.get(row.code);
    if (!existing) continue;
    const weekly = {
      ...(existing.weekly || {}),
      productWeek1: row.productWeek1,
      productWeek2: row.productWeek2,
    };
    toUpdate.push({
      code: existing.code,
      weekly,
      product_week1: row.productWeek1,
      product_week2: row.productWeek2,
    });
  }
  return toUpdate;
}

async function main() {
  const excelPath = resolveExcelPath();
  if (!excelPath) {
    console.log('[1·2주차 상품] data/daily에 NNNNPRIZE_SUM*.xlsx 없음. 업데이트 생략.');
    process.exit(0);
  }
  console.log('[1·2주차 상품] 엑셀:', excelPath);
  const rows = parsePrizeSumXlsx(excelPath);
  if (!rows || rows.length === 0) {
    console.error('파싱된 행 없음. 경로·열 인덱스 확인.');
    process.exit(1);
  }
  console.log('  파싱:', rows.length, '명 (K=설계사코드, AC=1주차 상품, AH=2주차 상품)');

  console.log('  기존 agents 조회 중...');
  const agentByCode = await fetchAllAgentsMap();
  console.log('  기존', agentByCode.size, '명');

  const toUpdate = await getUpdatePayload(agentByCode, rows);

  console.log('  → 반영 대상:', toUpdate.length, '명');

  const CONCURRENT = 80;
  let updated = 0;
  for (let i = 0; i < toUpdate.length; i += CONCURRENT) {
    const batch = toUpdate.slice(i, i + CONCURRENT);
    const results = await Promise.all(
      batch.map(({ code, weekly, product_week1, product_week2 }) =>
        supabase.from('agents').update({ weekly, product_week1, product_week2 }).eq('code', String(code)).select('code')
      )
    );
    const failed = results.filter((r) => r.error);
    if (failed.length) {
      failed.forEach((r, idx) => console.error('  update 실패:', batch[idx]?.code, r.error?.message));
    }
    updated += batch.length - failed.length;
    if ((i + batch.length) % 400 === 0 || i + batch.length === toUpdate.length) {
      console.log('  update', Math.min(i + CONCURRENT, toUpdate.length), '/', toUpdate.length);
    }
  }

  if (toUpdate.length > 0) {
    const checkCode = toUpdate[0].code;
    const { data: after } = await supabase.from('agents').select('code, weekly, product_week1, product_week2').eq('code', checkCode).single();
    console.log('  [검증]', checkCode, '→ product_week1:', after?.product_week1 ?? '(없음)', 'product_week2:', after?.product_week2 ?? '(없음)');
  }
  console.log('[1·2주차 상품] 완료. 반영:', updated);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
