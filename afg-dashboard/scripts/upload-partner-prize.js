/**
 * 파트너 시상 데이터 업로드 (PRIZE_SUM 엑셀 → Supabase agents.partner)
 *
 * - 지사명에 "파트너"가 포함된 설계사만 반영 (나머지 행 스킵)
 * - 202602 파일: data/daily/{MMDD}PRIZE_SUM_OUT_202602.xlsx → partner 전체 덮어쓰기
 * - 202601 파일: data/fix/1월마감PRIZE_SUM_OUT_202601.xlsx → partner에 1월 전용 필드만 병합
 *
 * 필요: .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY), xlsx
 * 실행: node scripts/upload-partner-prize.js [파일경로]
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

// 엑셀 컬럼 인덱스 (0-based). PARTNER_PRIZE_RULES.md §3.3 (0227PRIZE_SUM_OUT_202602.xlsx 기준)
const COL_CODE = 10;       // K: 설계사코드
// 2월 데이터
const COL_R = 17;          // R: 실적 1주 (참고용)
const COL_S = 18;          // S: 실적 2주 (참고용)
const COL_T = 19;          // T: 실적 3주 (참고용)
const COL_U = 20;          // U: 실적 4주 (참고용)
const COL_AB = 27;         // AB: 1주차 인보험 시상금
const COL_AC = 28;         // AC: 1주차 상품 실적
const COL_AD = 29;         // AD: 1주차 상품 시상금
const COL_AG = 32;         // AG: 2주차 인보험 시상금
const COL_AH = 33;         // AH: 2주차 상품 실적
const COL_AI = 34;         // AI: 2주차 상품 시상금
const COL_AL = 37;         // AL: 3주차 인보험 시상금
const COL_AM = 38;         // AM: 3-4주차 합산 실적
const COL_AN = 39;         // AN: 3-4주차 인보험 시상금
const COL_BL = 63;         // BL: 1-2월 연속가동 실적 (1월)
const COL_BM = 64;         // BM: 1-2월 연속가동 실적 (2월)
const COL_BN = 65;         // BN: 1-2월 연속가동 시상금
const COL_BR = 69;         // BR: 1-2월 추가 연속가동 실적 (1월)
const COL_BS = 70;         // BS: 1-2월 추가 연속가동 실적 (2월)
const COL_BT = 71;         // BT: 1-2월 추가 연속가동 시상금
const COL_BX = 75;         // BX: 2-3월 연속가동 실적 (2월)
const COL_BY = 76;         // BY: 2-3월 연속가동 실적 (3월, 3/1~3/15)
const COL_BZ = 77;         // BZ: 2-3월 연속가동 시상금
const COL_CB = 79;         // CB: 2-3월 추가 연속가동 실적 (2월)
const COL_CC = 80;         // CC: 2-3월 추가 연속가동 실적 (3월, 3/1~3/8)
const COL_CD = 81;         // CD: 2-3월 추가 연속가동 시상금
// 1월 파일 전용 (12~1월 연속가동, 2주차 인보험)
const COL_BJ = 61;         // BJ: 12-1 연속가동 12월 구간
const COL_BK = 62;         // BK: 12-1 연속가동 1월 실적
const COL_AK = 36;         // AK: 1월 2주차 인보험 실적

function toNum(val) {
  if (val == null || val === '') return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

// 1월 파일: 엑셀에 만원 단위(15, 20 등)로 적힌 경우 원으로 저장 (0 초과 10000 미만이면 ×10000)
function toNumOrWon(val) {
  const n = toNum(val);
  if (n == null) return undefined;
  if (n > 0 && n < 10000) return n * 10000;
  return n;
}

// 설계사코드 정규화: 엑셀 숫자/문자 불일치 시 매칭되도록 (예: 12345 vs "12345")
function normalizeCode(val) {
  if (val == null) return '';
  const s = String(val).trim();
  const n = Number(s);
  return Number.isFinite(n) ? String(n) : s;
}

function findLatestPrizeSumFile() {
  const dailyDir = path.join(__dirname, '..', '..', 'data', 'daily');
  if (!fs.existsSync(dailyDir)) return null;
  const files = fs
    .readdirSync(dailyDir)
    .filter((f) => /PRIZE_SUM/i.test(f) && /\.xlsx?$/i.test(f))
    .sort();
  return files.length > 0 ? path.join(dailyDir, files[files.length - 1]) : null;
}

function isJanuaryFile(filePath) {
  const base = path.basename(String(filePath || ''));
  return /202601|1월마감/i.test(base) || /202601|1월마감/i.test(String(filePath || ''));
}

function parsePrizeSumXlsx(filePath) {
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const result = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const code = normalizeCode(row[COL_CODE]);
    if (!code) continue;
    const partner = {
      productWeek1: toNum(row[COL_AC]),
      productWeek1InsPrize: toNum(row[COL_AB]),
      productWeek1Prize: toNum(row[COL_AD]),
      productWeek2: toNum(row[COL_AH]),
      productWeek2InsPrize: toNum(row[COL_AG]),
      productWeek2Prize: toNum(row[COL_AI]),
      week3Prize: toNum(row[COL_AL]),
      week34Sum: toNum(row[COL_AM]),
      week34Prize: toNum(row[COL_AN]),
      continuous12Jan: toNum(row[COL_BL]),
      continuous12Feb: toNum(row[COL_BM]),
      continuous12Prize: toNum(row[COL_BN]),
      continuous12ExtraJan: toNum(row[COL_BR]),
      continuous12ExtraFeb: toNum(row[COL_BS]),
      continuous12ExtraPrize: toNum(row[COL_BT]),
      continuous23Feb: toNum(row[COL_BX]),
      continuous23Mar: toNum(row[COL_BY]),
      continuous23Prize: toNum(row[COL_BZ]),
      continuous23ExtraFeb: toNum(row[COL_CB]) ?? toNum(row[COL_BX]),
      continuous23ExtraMar: toNum(row[COL_CC]),
      continuous23ExtraPrize: toNum(row[COL_CD]),
    };
    result.push({ code, partner });
  }
  return result;
}

/** 1월 파일 전용: BJ/BK/BL(12~1월 연속가동), AC/AD/AI/AJ(1·2주차) → 1월 전용 필드만 반환 */
function parsePrizeSumXlsxJanuary(filePath) {
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const result = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const code = normalizeCode(row[COL_CODE]);
    if (!code) continue;
    const januaryOnly = {
      productWeek1Jan: toNumOrWon(row[COL_AC]),
      productWeek1PrizeJan: toNumOrWon(row[COL_AD]),
      productWeek2Jan: toNumOrWon(row[COL_AI]),
      productWeek2PrizeJan: toNumOrWon(row[COL_AJ]),
      productWeek2InsJan: toNumOrWon(row[COL_AK]),
      continuous121Dec: toNumOrWon(row[COL_BJ]),
      continuous121Jan: toNumOrWon(row[COL_BK]),
      continuous121Prize: toNumOrWon(row[COL_BL]),
    };
    result.push({ code, januaryOnly });
  }
  return result;
}

/** Supabase에서 지사명에 "파트너" 포함된 설계사만 조회 → code 배열 반환 */
async function fetchPartnerAgentCodes() {
  const { data, error } = await supabase.from('agents').select('code, branch');
  if (error) throw error;
  const codes = (data || [])
    .filter((r) => String(r.branch || '').includes('파트너'))
    .map((r) => normalizeCode(r.code));
  return new Set(codes);
}

async function main() {
  let filePath = process.argv[2] || findLatestPrizeSumFile();
  if (!filePath || !fs.existsSync(filePath)) {
    const janPath = path.join(__dirname, '..', '..', 'data', 'fix', '1월마감PRIZE_SUM_OUT_202601.xlsx');
    if (fs.existsSync(janPath)) filePath = janPath;
    else {
      console.error('사용법: node scripts/upload-partner-prize.js [파일경로]');
      process.exit(1);
    }
  }

  const isJanuary = isJanuaryFile(filePath);
  console.log('[Partner Prize] 파일:', path.basename(filePath), isJanuary ? '(1월 병합)' : '(2월 전체)');
  console.log('  파트너 지사 설계사 목록 조회 중...');
  const partnerCodes = await fetchPartnerAgentCodes();
  console.log('  파트너 지사 설계사:', partnerCodes.size, '명');

  let updated = 0;
  let skipped = 0;

  if (isJanuary) {
    const rows = parsePrizeSumXlsxJanuary(filePath);
    const januaryByCode = new Map(rows.map((r) => [normalizeCode(r.code), r.januaryOnly]));
    for (const code of partnerCodes) {
      const januaryOnly = januaryByCode.get(code);
      if (!januaryOnly) { skipped++; continue; }
      const { data: row } = await supabase.from('agents').select('partner').eq('code', code).single();
      let partner = row?.partner && typeof row.partner === 'object' ? row.partner : {};
      const merged = { ...partner, ...januaryOnly };
      const { error } = await supabase.from('agents').update({ partner: merged }).eq('code', code);
      if (error) { console.error('  update 실패', code, error.message); continue; }
      updated++;
      if (updated % 50 === 0) console.log('  ', updated, '건 반영...');
    }
  } else {
    const rows = parsePrizeSumXlsx(filePath);
    const rowByCode = new Map(rows.map((r) => [normalizeCode(r.code), r.partner]));
    for (const code of partnerCodes) {
      const partner = rowByCode.get(code);
      if (!partner) { skipped++; continue; }
      const { error } = await supabase.from('agents').update({ partner }).eq('code', code);
      if (error) { console.error('  update 실패', code, error.message); continue; }
      updated++;
      if (updated % 50 === 0) console.log('  ', updated, '건 반영...');
    }
  }

  console.log('[Partner Prize] 완료. 반영:', updated, '건, 시트에 없어 스킵:', skipped, '건');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
