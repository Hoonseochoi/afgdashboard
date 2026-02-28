/**
 * 파트너 시상 데이터 업로드 (PRIZE_SUM 엑셀 → Appwrite agents.partner)
 *
 * - 지사명에 "파트너"가 포함된 설계사만 반영 (나머지 행 스킵)
 * - 202602 파일: data/daily/{MMDD}PRIZE_SUM_OUT_202602.xlsx → partner 전체 덮어쓰기
 * - 202601 파일: data/fix/1월마감PRIZE_SUM_OUT_202601.xlsx → partner에 1월 전용 필드만 병합
 *
 * 202602: K, AC/AD, AI/AJ, AM, BL/BM/BN, BR/BS/BT, BX
 * 202601: K, AC/AD, AI/AJ, BJ/BK/BL(12~1월 연속가동)
 *
 * 필요: .env.local (APPWRITE_*), xlsx
 * 실행: node scripts/upload-partner-prize.js [파일경로]
 *       파일경로 생략 시 data/daily 최신 *PRIZE_SUM*.xlsx 사용
 *       1월: node scripts/upload-partner-prize.js "data/fix/1월마감PRIZE_SUM_OUT_202601.xlsx"
 */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
require('dotenv').config({ path: envPath });

const { Client, Databases, Query } = require('node-appwrite');

// 엑셀 컬럼 인덱스 (0-based). PARTNER_PRIZE_RULES.md §3, PARTNER_PRIZE_JANUARY_MAPPING.md 참고
const COL_CODE = 10;       // K: 설계사코드
const COL_AC = 28;         // AC: 상품 1주차 실적
const COL_AD = 29;         // AD: 상품 1주차 시상금
const COL_AI = 34;         // AI: 상품 2주차 실적
const COL_AJ = 35;         // AJ: 상품 2주차 시상금
const COL_AM = 38;         // AM: 3-4주차 실적합
const COL_BL = 63;         // BL: 1-2월 연속가동 1월 구간 (202602) / 12-1 연속가동 시상금 (202601)
const COL_BM = 64;         // BM: 1-2월 연속가동 2월 구간
const COL_BN = 65;         // BN: 1-2월 연속가동 시상금
const COL_BR = 69;         // BR: 1-2월 추가연속가동 1월 구간
const COL_BS = 70;         // BS: 1-2월 추가연속가동 2월 구간
const COL_BT = 71;         // BT: 1-2월 추가연속가동 시상금
const COL_BX = 75;         // BX: 2-3월 연속가동 2월 구간
// 1월 파일 전용 (12~1월 연속가동, 2주차 인보험)
const COL_BJ = 61;         // BJ: 12-1 연속가동 12월 구간
const COL_BK = 62;         // BK: 12-1 연속가동 1월 실적
const COL_AK = 36;         // AK: 1월 2주차 인보험 실적 (AI=2주차 상품 실적과 구분)

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
      productWeek1Prize: toNum(row[COL_AD]),
      productWeek2: toNum(row[COL_AI]),
      productWeek2Prize: toNum(row[COL_AJ]),
      week34Sum: toNum(row[COL_AM]),
      continuous12Jan: toNum(row[COL_BL]),
      continuous12Feb: toNum(row[COL_BM]),
      continuous12Prize: toNum(row[COL_BN]),
      continuous12ExtraJan: toNum(row[COL_BR]),
      continuous12ExtraFeb: toNum(row[COL_BS]),
      continuous12ExtraPrize: toNum(row[COL_BT]),
      continuous23Feb: toNum(row[COL_BX]),
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

const LIST_PAGE_SIZE = 500;

/** Appwrite에서 지사명에 "파트너" 포함된 설계사만 조회 → code -> $id 맵 반환 */
async function fetchPartnerAgentIds(db, databaseId, collectionId) {
  const codeToId = new Map();
  let offset = 0;
  while (true) {
    const res = await db.listDocuments(databaseId, collectionId, [
      Query.limit(LIST_PAGE_SIZE),
      Query.offset(offset),
    ]);
    const docs = res.documents || [];
    for (const doc of docs) {
      const branch = String(doc.branch || '').trim();
      if (branch.includes('파트너')) codeToId.set(normalizeCode(doc.code), doc.$id);
    }
    if (docs.length < LIST_PAGE_SIZE) break;
    offset += LIST_PAGE_SIZE;
  }
  return codeToId;
}

async function main() {
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const agentsCollId = process.env.APPWRITE_AGENTS_COLLECTION_ID;
  const key = process.env.APPWRITE_API_KEY;
  if (!key || !databaseId || !agentsCollId) {
    throw new Error('APPWRITE_API_KEY, APPWRITE_DATABASE_ID, APPWRITE_AGENTS_COLLECTION_ID 필요');
  }

  let filePath = process.argv[2] || findLatestPrizeSumFile();
  if (!filePath || !fs.existsSync(filePath)) {
    const janPath = path.join(__dirname, '..', '..', 'data', 'fix', '1월마감PRIZE_SUM_OUT_202601.xlsx');
    if (fs.existsSync(janPath)) {
      filePath = janPath;
    } else {
      console.error('사용법: node scripts/upload-partner-prize.js [파일경로]');
      console.error('  파일 경로 생략 시 data/daily 내 최신 *PRIZE_SUM*.xlsx 사용');
      console.error('  1월: node scripts/upload-partner-prize.js "data/fix/1월마감PRIZE_SUM_OUT_202601.xlsx"');
      process.exit(1);
    }
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '69a11879001bc4449874')
    .setKey(key);
  const db = new Databases(client);

  const isJanuary = isJanuaryFile(filePath);
  console.log('[Partner Prize] 파일:', path.basename(filePath), isJanuary ? '(1월 병합)' : '(2월 전체)');
  console.log('  파트너 지사 설계사 목록 조회 중...');
  const partnerCodeToId = await fetchPartnerAgentIds(db, databaseId, agentsCollId);
  console.log('  파트너 지사 설계사:', partnerCodeToId.size, '명');

  let updated = 0;
  let skipped = 0;

  if (isJanuary) {
    const rows = parsePrizeSumXlsxJanuary(filePath);
    const januaryByCode = new Map(rows.map((r) => [normalizeCode(r.code), r.januaryOnly]));
    for (const [code, docId] of partnerCodeToId) {
      const januaryOnly = januaryByCode.get(code);
      if (!januaryOnly) {
        skipped++;
        continue;
      }
      const doc = await db.getDocument(databaseId, agentsCollId, docId);
      let partner = {};
      try {
        if (doc.partner && typeof doc.partner === 'string') partner = JSON.parse(doc.partner);
      } catch (_) {}
      const merged = { ...partner, ...januaryOnly };
      await db.updateDocument(databaseId, agentsCollId, docId, {
        partner: JSON.stringify(merged),
      });
      updated++;
      if (updated % 50 === 0) console.log('  ', updated, '건 반영...');
    }
  } else {
    const rows = parsePrizeSumXlsx(filePath);
    const rowByCode = new Map(rows.map((r) => [normalizeCode(r.code), r.partner]));
    for (const [code, docId] of partnerCodeToId) {
      const partner = rowByCode.get(code);
      if (!partner) {
        skipped++;
        continue;
      }
      await db.updateDocument(databaseId, agentsCollId, docId, {
        partner: JSON.stringify(partner),
      });
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
