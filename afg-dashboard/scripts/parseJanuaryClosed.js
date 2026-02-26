/**
 * 1월 마감 MC_LIST_OUT_202601.xlsx 파싱
 * - 지사명(AL열)이 "어센틱금융그룹" 포함인 행만 추출
 * - 사용인코드(E), 당월실적(K), 전월실적(R), 1주차실적(T), 2주차실적(U)
 * - mclist_mapping: 5=코드, 10=당월, 18=전월, 20=1주차, 21=2주차, 37=지사명
 */
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const INPUT = path.join(__dirname, "..", "..", "data", "fix", "1월마감MC_LIST_OUT_202601.xlsx");
const OUTPUT = path.join(__dirname, "..", "src", "data", "january_closed.json");

function parse() {
  if (!fs.existsSync(INPUT)) {
    console.error("파일 없음:", INPUT);
    process.exit(1);
  }

  const wb = XLSX.readFile(INPUT);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: 0 });

  const result = {};
  const header = rows[0] || [];
  const colIdx = (name) => {
    const i = header.indexOf(name);
    return i >= 0 ? i : -1;
  };

  // 헤더 행 찾기 (첫 행이 헤더가 아닐 수 있음)
  let headerRow = 0;
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const row = rows[r];
    if (Array.isArray(row) && row.some((c) => String(c).includes("사용인코드") || String(c).includes("당월실적"))) {
      headerRow = r;
      break;
    }
  }

  const getCol = (idx) => {
    if (idx < 0) return -1;
    const h = rows[headerRow];
    if (!h || !Array.isArray(h)) return idx;
    return idx;
  };

  // mclist_mapping: 0-based index
  const IDX_CODE = 5;
  const IDX_CURRENT = 10;   // 당월실적 (1월)
  const IDX_PREV = 18;      // 전월실적 (12월)
  const IDX_W1 = 20;        // 1주차실적
  const IDX_W2 = 21;        // 2주차실적
  const IDX_W3 = 22;        // 3주차실적
  const IDX_BRANCH = 37;    // 지사명

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    const branch = String(row[IDX_BRANCH] || "").trim();
    if (!branch.includes("어센틱금융그룹")) continue;

    const code = String(row[IDX_CODE] || "").trim();
    if (!code) continue;

    const currentMonth = Number(row[IDX_CURRENT]) || 0;
    const prevMonth = Number(row[IDX_PREV]) || 0;
    const w1 = Number(row[IDX_W1]) || 0;
    const w2 = Number(row[IDX_W2]) || 0;
    const w3 = Number(row[IDX_W3]) || 0;

    result[code] = {
      code,
      performance: {
        "2025-12": prevMonth,
        "2026-01": currentMonth,
      },
      weekly: {
        week1: w1,
        week2: w2,
        week3: w3,
      },
    };
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2), "utf8");
  console.log(`1월 마감 데이터 파싱 완료: ${Object.keys(result).length}명 → ${OUTPUT}`);
}

parse();
