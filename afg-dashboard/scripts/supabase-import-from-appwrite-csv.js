/**
 * Appwrite CSV Export → Supabase agents 테이블 import 스크립트
 *
 * 전제:
 * - Supabase에 이미 agents/config 테이블이 생성되어 있음 (PLAN_SUPABASE_MIGRATION.md 참고)
 * - .env.local 에 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 설정
 * - Appwrite에서 export 한 CSV 파일 경로:
 *   - 기본: 프로젝트 루트의 appwrite.csv
 *   - 또는 인자로 지정: node scripts/supabase-import-from-appwrite-csv.js C:\path\to\appwrite.csv
 *
 * 사용 예:
 *   node scripts/supabase-import-from-appwrite-csv.js
 *   node scripts/supabase-import-from-appwrite-csv.js ../appwrite.csv
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// .env.local 로드 (APPWRITE 스크립트들과 동일 패턴)
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
  console.error(
    "[supabase-import-from-appwrite-csv] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 설정되어 있지 않습니다.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CSV_PATH_ARG = process.argv[2];
const CSV_PATH = CSV_PATH_ARG
  ? path.resolve(CSV_PATH_ARG)
  : path.resolve(__dirname, "..", "appwrite.csv");

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

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error("[supabase-import-from-appwrite-csv] CSV 파일을 찾을 수 없습니다:", CSV_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) {
    console.error("[supabase-import-from-appwrite-csv] CSV 내용이 비어 있습니다.");
    process.exit(1);
  }

  const header = parseCsvLine(lines[0]);
  const colIndex = (name) => header.indexOf(name);

  const idxCode = colIndex("code");
  const idxName = colIndex("name");
  const idxPassword = colIndex("password");
  const idxRole = colIndex("role");
  const idxPerformance = colIndex("performance");
  const idxWeekly = colIndex("weekly");
  const idxManagerCode = colIndex("managerCode");
  const idxManagerName = colIndex("managerName");
  const idxBranch = colIndex("branch");
  const idxTargetManagerCode = colIndex("targetManagerCode");
  const idxIsFirstLogin = colIndex("isFirstLogin");
  const idxPartner = colIndex("partner");

  if (idxCode === -1 || idxName === -1) {
    console.error("[supabase-import-from-appwrite-csv] code / name 컬럼을 찾을 수 없습니다.");
    process.exit(1);
  }

  console.log(
    "[supabase-import-from-appwrite-csv] CSV 행 수:",
    lines.length - 1,
  );

  let success = 0;
  let failed = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (!row.length || row.every((v) => v === "")) continue;

    const code = row[idxCode]?.trim();
    const name = row[idxName]?.trim();
    if (!code || !name) continue;

    const password = idxPassword >= 0 ? row[idxPassword] || null : null;
    const role = idxRole >= 0 ? row[idxRole] || null : null;

    const parseJsonField = (val) => {
      if (!val || val === "null") return {};
      try {
        return JSON.parse(val);
      } catch {
        return {};
      }
    };

    const performance =
      idxPerformance >= 0 ? parseJsonField(row[idxPerformance]) : {};
    const weekly =
      idxWeekly >= 0 ? parseJsonField(row[idxWeekly]) : {};
    const partner =
      idxPartner >= 0 ? parseJsonField(row[idxPartner]) : {};

    const managerCode =
      idxManagerCode >= 0 && row[idxManagerCode]
        ? row[idxManagerCode]
        : null;
    const managerName =
      idxManagerName >= 0 && row[idxManagerName]
        ? row[idxManagerName]
        : null;
    const branch =
      idxBranch >= 0 && row[idxBranch] ? row[idxBranch] : null;

    const targetManagerCodeRaw =
      idxTargetManagerCode >= 0 ? row[idxTargetManagerCode] : null;
    const targetManagerCode =
      targetManagerCodeRaw && targetManagerCodeRaw !== "null"
        ? targetManagerCodeRaw
        : null;

    const isFirstLoginRaw =
      idxIsFirstLogin >= 0 ? row[idxIsFirstLogin] : "true";
    const isFirstLogin = String(isFirstLoginRaw).toLowerCase() === "true";

    const payload = {
      code,
      name,
      password,
      role,
      performance,
      weekly,
      partner,
      manager_code: managerCode,
      manager_name: managerName,
      branch,
      is_first_login: isFirstLogin,
      target_manager_code: targetManagerCode,
    };

    const { error } = await supabase
      .from("agents")
      .upsert(payload, { onConflict: "code" });

    if (error) {
      failed++;
      console.error(
        `[${i}/${lines.length - 1}] code=${code} upsert 실패:`,
        error.message,
        error.code ? `(code: ${error.code})` : "",
        error.details ? JSON.stringify(error.details) : "",
      );
    } else {
      success++;
      if (success % 200 === 0) {
        console.log(`  ${success}건 upsert 완료...`);
      }
    }
  }

  console.log(
    "[supabase-import-from-appwrite-csv] 완료. 성공:",
    success,
    "실패:",
    failed,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

