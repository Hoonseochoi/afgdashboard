/**
 * 1월 마감 MC_LIST_OUT_202601.xlsx 파싱
 *
 * 컬럼 매핑 (backdata_rules.md 참조):
 *   F  (idx 5)  : 설계사코드
 *   K  (idx 10) : 1월 실적 (당월)
 *   S  (idx 18) : 12월 실적 (이전월)
 *   T  (idx 19) : 11월 실적 (전전월)
 *   U  (idx 20) : 1주차 실적
 *   V  (idx 21) : 2주차 실적
 *   W  (idx 22) : 3주차 실적
 *   X  (idx 23) : 4주차 실적
 *   AL (idx 37) : 대리점지사명 (필터: "어센틱금융그룹" 포함)
 *
 * 실행: node scripts/parseJanuaryClosed.js
 */
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

// afg-dashboard/ 폴더에서 실행 (node scripts/parseJanuaryClosed.js)
const ROOT   = path.resolve(__dirname, '..');
const DATA   = path.resolve(ROOT, '..', 'data', 'fix');
const INPUT  = path.join(DATA, '1월마감MC_LIST_OUT_202601.xlsx');
const OUTPUT = path.join(ROOT, 'src', 'data', 'january_closed.json');

// ── 컬럼 인덱스 정의 (0-based) ──────────────────────────────────────────────
const COL = {
  CODE:    5,   // F  - 설계사코드
  JAN:    10,   // K  - 1월 실적 (당월)
  DEC:    18,   // S  - 12월 실적 (이전월)
  NOV:    19,   // T  - 11월 실적 (전전월)
  WEEK1:  20,   // U  - 1주차
  WEEK2:  21,   // V  - 2주차
  WEEK3:  22,   // W  - 3주차
  WEEK4:  23,   // X  - 4주차
  BRANCH: 37,   // AL - 대리점지사명
};

const BRANCH_FILTER = "어센틱금융그룹";

function parse() {
  if (!fs.existsSync(INPUT)) {
    console.error("❌ 파일 없음:", INPUT);
    process.exit(1);
  }

  const wb   = XLSX.readFile(INPUT);
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: 0 });

  // 헤더 행 자동 감지
  let headerRow = 0;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = rows[r];
    if (Array.isArray(row) && row.some((c) =>
      String(c).includes("사용인코드") || String(c).includes("당월") || String(c).includes("설계사")
    )) {
      headerRow = r;
      break;
    }
  }
  console.log(`ℹ️  헤더 행: ${headerRow + 1}번째 행`);

  const result = {};
  let skipped = 0;

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    // 지사명 필터
    const branch = String(row[COL.BRANCH] ?? "").trim();
    if (!branch.includes(BRANCH_FILTER)) continue;

    // 설계사코드 검증
    const code = String(row[COL.CODE] ?? "").trim();
    if (!code || code.length < 5) { skipped++; continue; }

    const jan  = Number(row[COL.JAN])   || 0;
    const dec  = Number(row[COL.DEC])   || 0;
    const nov  = Number(row[COL.NOV])   || 0;
    const w1   = Number(row[COL.WEEK1]) || 0;
    const w2   = Number(row[COL.WEEK2]) || 0;
    const w3   = Number(row[COL.WEEK3]) || 0;
    const w4   = Number(row[COL.WEEK4]) || 0;

    result[code] = {
      code,
      performance: {
        "2025-11": nov,  // T열 전전월
        "2025-12": dec,  // S열 이전월
        "2026-01": jan,  // K열 당월
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
  console.log(`✅ 1월 마감 파싱 완료: ${Object.keys(result).length}명 → ${OUTPUT}`);
  if (skipped > 0) console.log(`   (코드 오류로 건너뜀: ${skipped}건)`);
}

parse();
