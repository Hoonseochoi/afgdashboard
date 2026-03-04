/**
 * 2월 마감 MC_LIST_OUT_202602.xlsx 파싱
 * - 지사명(AL열)이 "어센틱금융그룹" 포함인 행만 추출
 * - 사용인코드(5), 당월실적(10)=2월, 전월실적(18)=1월, 1~4주차실적(20~23), 지사명(37)
 * - mclist_mapping: 5=코드, 10=당월, 18=전월, 20~23=1~4주차, 37=지사명
 */
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const INPUT = path.join(__dirname, "..", "..", "data", "fix", "2월마감MC_LIST_OUT_202602.xlsx");
const OUTPUT = path.join(__dirname, "..", "src", "data", "february_closed.json");

function parse() {
  if (!fs.existsSync(INPUT)) {
    console.error("파일 없음:", INPUT);
    process.exit(1);
  }

  const wb = XLSX.readFile(INPUT);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: 0 });

  const result = {};

  // 헤더 행 찾기
  let headerRow = 0;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = rows[r];
    if (Array.isArray(row) && row.some((c) => String(c).includes("사용인코드") || String(c).includes("당월실적"))) {
      headerRow = r;
      break;
    }
  }

  // 0-based index (MC_LIST_OUT 동일)
  const IDX_CODE = 5;
  const IDX_CURRENT = 10;   // 당월실적 (2월)
  const IDX_PREV = 18;      // 전월실적 (1월)
  const IDX_W1 = 20;
  const IDX_W2 = 21;
  const IDX_W3 = 22;
  const IDX_W4 = 23;
  const IDX_BRANCH = 37;

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    const branch = String(row[IDX_BRANCH] ?? "").trim();
    if (!branch.includes("어센틱금융그룹")) continue;

    const code = String(row[IDX_CODE] ?? "").trim();
    if (!code || code.length < 5) continue;

    const currentMonth = Number(row[IDX_CURRENT]) || 0;
    const prevMonth = Number(row[IDX_PREV]) || 0;
    const w1 = Number(row[IDX_W1]) || 0;
    const w2 = Number(row[IDX_W2]) || 0;
    const w3 = Number(row[IDX_W3]) || 0;
    const w4 = Number(row[IDX_W4]) || 0;

    result[code] = {
      code,
      performance: {
        "2026-01": prevMonth,
        "2026-02": currentMonth,
      },
      weekly: {
        week1: w1,
        week2: w2,
        week3: w3,
        week4: w4,
      },
    };
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2), "utf8");
  console.log(`2월 마감 데이터 파싱 완료: ${Object.keys(result).length}명 → ${OUTPUT}`);
}

parse();
