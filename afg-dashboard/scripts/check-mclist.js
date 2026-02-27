/**
 * MC_LIST 파일 구조 확인 + 어센틱 설계사 목록 추출 (노가연 등 검증용)
 * 실행: node scripts/check-mclist.js
 */
const path = require("path");
const XLSX = require("xlsx");

const FILE = path.join(__dirname, "..", "..", "data", "daily", "0227MC_LIST_OUT_202602.xlsx");

const wb = XLSX.readFile(FILE);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

const headerRow = 0;
const headers = (rows[headerRow] || []).map((c) => String(c));
console.log("Total columns:", headers.length);
headers.forEach((h, i) => {
  if (h && (h.includes("코드") || h.includes("실적") || h.includes("어센틱") || h.includes("조직") || h.includes("명") || h.includes("지점"))) console.log(i, h);
});

const codeIdx = headers.findIndex((c) => /설계사.*조직코드|사용인코드|설계사코드/.test(c));
const codeIdx2 = headers.findIndex((c) => c === "현재대리점설계사조직코드");
const CODE = codeIdx >= 0 ? codeIdx : codeIdx2 >= 0 ? codeIdx2 : 5;

const nameIdx = headers.findIndex((c) => /설계사.*명|사원명|성명/.test(c));
const nameIdx2 = headers.findIndex((c) => c === "현재대리점설계사조직명");
const NAME = nameIdx >= 0 ? nameIdx : nameIdx2 >= 0 ? nameIdx2 : 6;

let BRANCH = -1;
for (let r = headerRow + 1; r < Math.min(rows.length, headerRow + 500); r++) {
  const row = rows[r];
  for (let i = 0; i < (row || []).length; i++) {
    if (String(row[i] || "").includes("어센틱")) { BRANCH = i; console.log("어센틱 found at column", i, "header:", headers[i]); break; }
  }
  if (BRANCH >= 0) break;
}
if (BRANCH < 0) BRANCH = 37;

console.log("\nUsing CODE:", CODE, "NAME:", NAME, "BRANCH:", BRANCH);

const list = [];
for (let r = headerRow + 1; r < rows.length; r++) {
  const row = rows[r];
  if (!Array.isArray(row)) continue;
  const branch = String(row[BRANCH] ?? "").trim();
  if (!branch.includes("어센틱")) continue;
  const code = String(row[CODE] ?? "").trim();
  if (!code || code.length < 5) continue;
  const name = NAME >= 0 ? String(row[NAME] ?? "").trim() : "";
  list.push({ code, name, branch: branch.slice(0, 40) });
}

console.log("\n어센틱 설계사 수:", list.length);
const nodeGaYeon = list.filter((a) => a.name.includes("노가연") || a.code.includes("노가연"));
console.log("'노가연' 검색:", nodeGaYeon.length, nodeGaYeon);
if (list.length > 0) console.log("처음 3명:", list.slice(0, 3));
