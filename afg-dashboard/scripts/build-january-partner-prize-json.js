/**
 * 1월 마감 PRIZE_SUM 엑셀 → 고정 JSON (파트너 1월 시상 데이터)
 * 출력: src/data/january_partner_prize.json (Supabase 없이 로드용)
 *
 * 실행: node scripts/build-january-partner-prize-json.js
 * 입력: data/fix/1월마감PRIZE_SUM_OUT_202601.xlsx
 */
const path = require("path");
const fs = require("fs");

const COL_CODE = 10;   // K
const COL_AC = 28;     // 1주차 실적
const COL_AD = 29;     // 1주차 시상금
const COL_AG = 32;     // 2주차 인보험 시상금
const COL_AI = 34;     // 2주차 상품 실적
const COL_AJ = 35;     // 2주차 상품 시상금
const COL_AK = 36;     // 2주차 인보험 실적
const COL_AL = 37;     // 3주차 인보험 시상금
const COL_AM = 38;     // 3-4주차 합산 실적
const COL_AN = 39;     // 3-4주차 시상금
const COL_BJ = 61;     // 12-1 연속가동 12월 구간
const COL_BK = 62;     // 12-1 연속가동 1월 실적
const COL_BL = 63;     // 12-1 연속가동 시상금

function toNum(val) {
  if (val == null || val === "") return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

function toNumOrWon(val) {
  const n = toNum(val);
  if (n == null) return undefined;
  if (n > 0 && n < 10000) return n * 10000;
  return n;
}

function normalizeCode(val) {
  if (val == null) return "";
  const s = String(val).trim();
  const n = Number(s);
  return Number.isFinite(n) ? String(n) : s;
}

function main() {
  const xlsxPath = path.join(__dirname, "..", "..", "data", "fix", "1월마감PRIZE_SUM_OUT_202601.xlsx");
  if (!fs.existsSync(xlsxPath)) {
    console.error("파일 없음:", xlsxPath);
    process.exit(1);
  }
  const XLSX = require("xlsx");
  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const out = {};
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const code = normalizeCode(row[COL_CODE]);
    if (!code) continue;
    out[code] = {
      productWeek1Jan: toNum(row[COL_AC]),
      productWeek1PrizeJan: toNumOrWon(row[COL_AD]),
      productWeek2Jan: toNum(row[COL_AI]),
      productWeek2PrizeJan: toNumOrWon(row[COL_AJ]),
      productWeek2InsJan: toNumOrWon(row[COL_AK]),
      productWeek2InsPrizeJan: toNumOrWon(row[COL_AG]),
      week3PrizeJan: toNumOrWon(row[COL_AL]),
      week34SumJan: toNum(row[COL_AM]),
      week34PrizeJan: toNumOrWon(row[COL_AN]),
      continuous121Dec: toNumOrWon(row[COL_BJ]),
      continuous121Jan: toNumOrWon(row[COL_BK]),
      continuous121Prize: toNumOrWon(row[COL_BL]),
    };
  }
  const outPath = path.join(__dirname, "..", "src", "data", "january_partner_prize.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 0), "utf8");
  console.log("[1월 파트너 시상 JSON] 작성 완료:", outPath, "건수:", Object.keys(out).length);
}

main();
