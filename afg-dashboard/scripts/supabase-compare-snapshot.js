/**
 * CSV(Appwrite export) vs Supabase 데이터 스냅샷 비교 스크립트 (테스트 모드)
 *
 * 목적:
 * - Appwrite API를 더 이상 호출하지 않고,
 * - CSV(appwrite.csv)를 기준으로 Supabase agents 데이터가 동일한지 검증
 *
 * 전제:
 * - 프로젝트 루트에 appwrite.csv 존재 (또는 인자로 경로 전달)
 * - Supabase env(SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)가 설정되어 있음
 * - Supabase에는 이미 supabase-import-from-appwrite-csv.js 등으로 데이터가 import 된 상태
 *
 * 사용:
 *   node scripts/supabase-compare-snapshot.js
 *   node scripts/supabase-compare-snapshot.js C:\path\to\appwrite.csv
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// .env.local 로드
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[compare] Supabase 환경변수가 부족합니다.");
  process.exit(1);
}

const CSV_PATH_ARG = process.argv[2];
const CSV_PATH = CSV_PATH_ARG
  ? path.resolve(CSV_PATH_ARG)
  : path.resolve(__dirname, "..", "appwrite.csv");

const RANK_EXCLUDE_CODE = "712345678";

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function safeParse(jsonLike) {
  if (!jsonLike || jsonLike === "null") return {};
  if (typeof jsonLike === "object") return jsonLike || {};
  try {
    return JSON.parse(jsonLike);
  } catch {
    return {};
  }
}

async function fetchCsvAgents() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error("[compare] CSV 파일을 찾을 수 없습니다:", CSV_PATH);
    process.exit(1);
  }
  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) {
    console.error("[compare] CSV 내용이 비어 있습니다.");
    process.exit(1);
  }
  const header = parseCsvLine(lines[0]);
  const colIndex = (name) => header.indexOf(name);

  const idxCode = colIndex("code");
  const idxPerformance = colIndex("performance");
  const idxWeekly = colIndex("weekly");
  const idxPartner = colIndex("partner");
  const idxBranch = colIndex("branch");
  const idxManagerName = colIndex("managerName");

  const agents = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    const code = row[idxCode]?.trim();
    if (!code || code === RANK_EXCLUDE_CODE) continue;
    agents.push({
      code,
      performance: idxPerformance >= 0 ? row[idxPerformance] : "",
      weekly: idxWeekly >= 0 ? row[idxWeekly] : "",
      partner: idxPartner >= 0 ? row[idxPartner] : "",
      branch: idxBranch >= 0 ? row[idxBranch] : "",
      managerName: idxManagerName >= 0 ? row[idxManagerName] : "",
    });
  }
  return agents;
}

async function fetchSupabaseAgents() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.from("agents").select("*");
  if (error) {
    console.error("[compare] Supabase agents 조회 실패:", error.message);
    process.exit(1);
  }
  return data || [];
}

function compareAgents(csvAgents, supabaseRows) {
  const csvByCode = new Map();
  for (const a of csvAgents) {
    csvByCode.set(a.code, a);
  }

  const supByCode = new Map();
  for (const row of supabaseRows) {
    const code = String(row.code || "").trim();
    if (!code || code === RANK_EXCLUDE_CODE) continue;
    supByCode.set(code, row);
  }

  let missingInSupabase = 0;
  let missingInCsv = 0;
  let perfDiff = 0;
  let weeklyDiff = 0;
  let partnerDiff = 0;
  let metaDiff = 0;

  for (const [code, csv] of csvByCode.entries()) {
    const row = supByCode.get(code);
    if (!row) {
      missingInSupabase++;
      continue;
    }

    const perfCsv = safeParse(csv.performance);
    const perfSup = safeParse(row.performance);
    if (JSON.stringify(perfCsv) !== JSON.stringify(perfSup)) {
      perfDiff++;
    }

    const weeklyCsv = safeParse(csv.weekly);
    const weeklySup = safeParse(row.weekly);
    if (JSON.stringify(weeklyCsv) !== JSON.stringify(weeklySup)) {
      weeklyDiff++;
    }

    const partnerCsv = safeParse(csv.partner);
    const partnerSup = safeParse(row.partner);
    if (JSON.stringify(partnerCsv) !== JSON.stringify(partnerSup)) {
      partnerDiff++;
    }

    const branchCsv = csv.branch || null;
    const branchSup = row.branch || null;
    const managerNameCsv = csv.managerName || null;
    const managerNameSup = row.manager_name || null;
    if (branchCsv !== branchSup || managerNameCsv !== managerNameSup) {
      metaDiff++;
    }
  }

  for (const code of supByCode.keys()) {
    if (!csvByCode.has(code)) {
      missingInCsv++;
    }
  }

  return {
    totalCsv: csvByCode.size,
    totalSupabase: supByCode.size,
    missingInSupabase,
    missingInCsv,
    perfDiff,
    weeklyDiff,
    partnerDiff,
    metaDiff,
  };
}

async function main() {
  console.log("[compare] CSV → agents 로드 중...");
  const csvAgents = await fetchCsvAgents();
  console.log("[compare] CSV agents 수:", csvAgents.length);

  console.log("[compare] Supabase → agents 전체 조회 중...");
  const supRows = await fetchSupabaseAgents();
  console.log("[compare] Supabase agents 수:", supRows.length);

  const summary = compareAgents(csvAgents, supRows);
  console.log("[compare] 요약:");
  console.table(summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

