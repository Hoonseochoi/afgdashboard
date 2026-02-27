/**
 * PocketBase 일일(0227 등) 반영
 * - data/daily 폴더의 최신 NNNNMC_LIST*.xlsx 파싱
 * - config (key=app) updateDate 갱신
 * - agents 컬렉션에 당월/전월 실적, 주차 실적 merge
 *
 * 필요: .env.local (POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD), xlsx
 * 실행: node scripts/pb-upload-daily.js
 */
const path = require("path");
const fs = require("fs");

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
require("dotenv").config({ path: envPath });

const PB_URL = (process.env.POCKETBASE_URL || "http://127.0.0.1:8090").replace(/\/$/, "");
const PB_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

// 0227MC_LIST_OUT_202602.xlsx 컬럼: 5=설계사조직코드, 6=설계사조직명(이름), 10=인정실적(당월), 18=이전월인정실적, 20-23=주차, 37=현재대리점지사명(어센틱)
const IDX_CODE = 5;
const IDX_NAME = 6;
const IDX_CURRENT = 10;
const IDX_PREV = 18;
const IDX_W1 = 20;
const IDX_W2 = 21;
const IDX_W3 = 22;
const IDX_W4 = 23;
const IDX_BRANCH = 37;

function findLatestDailyFile() {
  const dailyDir = path.join(__dirname, "..", "..", "data", "daily");
  if (!fs.existsSync(dailyDir)) return null;
  const files = fs.readdirSync(dailyDir).filter((f) => /^\d{4}MC_LIST/i.test(f) && /\.xlsx?$/i.test(f));
  if (files.length === 0) return null;
  const sorted = files.sort();
  return path.join(dailyDir, sorted[sorted.length - 1]);
}

function parseMonthFromFilename(filename) {
  const match = filename.match(/_(\d{6})\.xlsx?$/i) || filename.match(/(\d{6})\.xlsx?$/i);
  if (!match) return { current: "2026-02", prev: "2026-01" };
  const ym = match[1];
  const y = ym.slice(0, 4);
  const m = parseInt(ym.slice(4), 10);
  const current = `${y}-${String(m).padStart(2, "0")}`;
  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? String(parseInt(y, 10) - 1) : y;
  const prev = `${prevY}-${String(prevM).padStart(2, "0")}`;
  return { current, prev };
}

function parseDailyXlsx(filePath) {
  const XLSX = require("xlsx");
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: 0 });

  let headerRow = 0;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = rows[r];
    if (Array.isArray(row) && row.some((c) => String(c).includes("인정실적") || String(c).includes("사용인코드"))) {
      headerRow = r;
      break;
    }
  }

  const result = [];
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const branch = String(row[IDX_BRANCH] ?? "").trim();
    if (!branch.includes("어센틱")) continue;
    const code = String(row[IDX_CODE] ?? "").trim();
    if (!code || code.length < 5) continue;
    const name = String(row[IDX_NAME] ?? "").trim() || code;
    result.push({
      code,
      name,
      branch,
      currentMonth: Number(row[IDX_CURRENT]) || 0,
      prevMonth: Number(row[IDX_PREV]) || 0,
      week1: Number(row[IDX_W1]) || 0,
      week2: Number(row[IDX_W2]) || 0,
      week3: Number(row[IDX_W3]) || 0,
      week4: Number(row[IDX_W4]) || 0,
    });
  }
  return result;
}

async function pbFetch(apiPath, options = {}) {
  const url = apiPath.startsWith("http") ? apiPath : `${PB_URL}${apiPath.startsWith("/") ? "" : "/api/"}${apiPath}`;
  return fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
}

async function adminAuth() {
  if (!PB_EMAIL || !PB_PASSWORD) throw new Error("POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD required");
  const res = await pbFetch("/api/collections/_superusers/auth-with-password", {
    method: "POST",
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD, identityField: "email" }),
  });
  if (!res.ok) throw new Error(`Admin auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.token;
}

async function getAgentByCode(token, code) {
  const safe = String(code).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const res = await pbFetch(
    `/api/collections/agents/records?filter=${encodeURIComponent('(code = "' + safe + '")')}&perPage=1`,
    { headers: { Authorization: token } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const items = data.items ?? [];
  return items.length > 0 ? items[0] : null;
}

async function createAgent(token, row, currentMonthKey, prevMonthKey) {
  const performance = { [currentMonthKey]: row.currentMonth, [prevMonthKey]: row.prevMonth };
  const weekly = { week1: row.week1, week2: row.week2, week3: row.week3, week4: row.week4 };
  const body = {
    code: row.code,
    name: row.name,
    branch: row.branch || null,
    password: row.code,
    role: "agent",
    isFirstLogin: true,
    performance,
    weekly,
    managerCode: null,
    managerName: null,
    targetManagerCode: null,
  };
  const res = await pbFetch("/api/collections/agents/records", {
    method: "POST",
    headers: { Authorization: token },
    body: JSON.stringify(body),
  });
  return res.ok;
}

async function updateConfigAppUpdateDate(token, updateDate) {
  const listRes = await pbFetch(
    `/api/collections/config/records?filter=${encodeURIComponent('(key = "app")')}&perPage=1`,
    { headers: { Authorization: token } }
  );
  if (!listRes.ok) throw new Error(`Config list failed: ${listRes.status}`);
  const listData = await listRes.json();
  const items = listData.items ?? [];
  if (items.length === 0) {
    const createRes = await pbFetch("/api/collections/config/records", {
      method: "POST",
      headers: { Authorization: token },
      body: JSON.stringify({ key: "app", updateDate }),
    });
    if (!createRes.ok) throw new Error(`Config create failed: ${createRes.status}`);
    return;
  }
  const id = items[0].id;
  const patchRes = await pbFetch(`/api/collections/config/records/${id}`, {
    method: "PATCH",
    headers: { Authorization: token },
    body: JSON.stringify({ updateDate }),
  });
  if (!patchRes.ok) throw new Error(`Config update failed: ${patchRes.status}`);
}

async function main() {
  console.log("[PB Daily] 일일 실적 반영 시작...");

  const filePath = findLatestDailyFile();
  if (!filePath) {
    console.error("  data/daily 폴더에 NNNNMC_LIST*.xlsx 파일이 없습니다.");
    process.exit(1);
  }

  const fileName = path.basename(filePath);
  const updateDate = fileName.substring(0, 4);
  const { current: currentMonthKey, prev: prevMonthKey } = parseMonthFromFilename(fileName);
  console.log("  파일:", fileName, "→ updateDate:", updateDate, "당월:", currentMonthKey, "전월:", prevMonthKey);

  const rows = parseDailyXlsx(filePath);
  console.log("  어센틱금융그룹 설계사", rows.length, "명 파싱됨");

  const token = await adminAuth();
  console.log("  Admin 인증 완료");

  await updateConfigAppUpdateDate(token, updateDate);
  console.log("  config.app.updateDate =", updateDate);

  let updated = 0;
  let created = 0;
  const orderedCodes = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    orderedCodes.push(row.code);
    const agent = await getAgentByCode(token, row.code);
    if (!agent) {
      const ok = await createAgent(token, row, currentMonthKey, prevMonthKey);
      if (ok) created++;
      if ((i + 1) % 500 === 0) console.log("  ", i + 1, "건 처리...");
      continue;
    }
    const performance = { ...(agent.performance || {}), [currentMonthKey]: row.currentMonth, [prevMonthKey]: row.prevMonth };
    const weekly = { week1: row.week1, week2: row.week2, week3: row.week3, week4: row.week4 };
    const res = await pbFetch(`/api/collections/agents/records/${agent.id}`, {
      method: "PATCH",
      headers: { Authorization: token },
      body: JSON.stringify({ performance, weekly }),
    });
    if (res.ok) updated++;
    if ((i + 1) % 500 === 0) console.log("  ", i + 1, "건 처리...");
  }

  const orderPath = path.join(__dirname, "..", "src", "data", "agent-order.json");
  fs.writeFileSync(orderPath, JSON.stringify({ updateDate, codes: orderedCodes }, null, 2), "utf8");
  console.log("  agent-order.json 저장 (MC_LIST 순서,", orderedCodes.length, "명)");

  console.log("[PB Daily] 완료. updateDate:", updateDate, "실적 반영:", updated, "건, 신규 생성:", created);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
