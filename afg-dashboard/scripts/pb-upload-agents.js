/**
 * PocketBase에 설계사·매니저·관리자 데이터 업로드
 * - data.json + 매니저/관리자 계정 → agents 컬렉션
 * - config 컬렉션에 app (updateDate) 1건
 *
 * 필요 환경 변수 (.env.local):
 *   POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD
 *
 * 실행: node scripts/pb-upload-agents.js
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
require("dotenv").config({ path: envPath }); // dotenv는 기존 env를 덮어쓰지 않음

const PB_URL = (process.env.POCKETBASE_URL || "http://127.0.0.1:8090").replace(/\/$/, "");
const PB_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;
const RANK_EXCLUDE_CODE = "712345678";

async function pbFetch(apiPath, options = {}) {
  const url = apiPath.startsWith("http") ? apiPath : `${PB_URL}${apiPath.startsWith("/") ? "" : "/api/"}${apiPath}`;
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  return res;
}

async function adminAuth() {
  if (!PB_EMAIL || !PB_PASSWORD) {
    throw new Error("POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set in .env.local");
  }
  // v0.23+ 에서는 /api/admins/* 제거 → _superusers 컬렉션 인증 사용
  const authUrl = `${PB_URL}/api/collections/_superusers/auth-with-password`;
  console.log("[PB Upload] Admin auth:", authUrl);
  const body = { identity: PB_EMAIL, password: PB_PASSWORD, identityField: "email" };
  const res = await pbFetch("/api/collections/_superusers/auth-with-password", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const resText = await res.text();
  if (!res.ok) {
    console.error("[PB Upload] Auth response:", resText);
    throw new Error(`Admin auth failed: ${res.status} ${resText}`);
  }
  const data = JSON.parse(resText);
  return data.token;
}

async function ensureCollections(token) {
  const listRes = await pbFetch("/api/collections", { headers: { Authorization: token } });
  if (!listRes.ok) throw new Error(`List collections failed: ${listRes.status}`);
  const list = await listRes.json();
  const raw = list.items ?? (Array.isArray(list) ? list : []);
  const names = raw.map((c) => (typeof c === "string" ? c : c.name));

  if (!names.includes("agents")) {
    const schema = [
      { name: "code", type: "text", required: true },
      { name: "name", type: "text", required: true },
      { name: "branch", type: "text" },
      { name: "password", type: "text" },
      { name: "performance", type: "json" },
      { name: "weekly", type: "json" },
      { name: "managerCode", type: "text" },
      { name: "managerName", type: "text" },
      { name: "role", type: "text" },
      { name: "isFirstLogin", type: "bool" },
      { name: "targetManagerCode", type: "text" },
    ];
    const createRes = await pbFetch("/api/collections", {
      method: "POST",
      headers: { Authorization: token },
      body: JSON.stringify({ name: "agents", type: "base", schema }),
    });
    if (!createRes.ok) throw new Error(`Create agents collection failed: ${createRes.status} ${await createRes.text()}`);
    console.log("  [PB] agents 컬렉션 생성됨");
  } else {
    console.log("  [PB] agents 컬렉션 이미 존재");
  }

  if (!names.includes("config")) {
    const schema = [
      { name: "key", type: "text", required: true },
      { name: "updateDate", type: "text" },
    ];
    const createRes = await pbFetch("/api/collections", {
      method: "POST",
      headers: { Authorization: token },
      body: JSON.stringify({ name: "config", type: "base", schema }),
    });
    if (!createRes.ok) throw new Error(`Create config collection failed: ${createRes.status} ${await createRes.text()}`);
    console.log("  [PB] config 컬렉션 생성됨");
  } else {
    console.log("  [PB] config 컬렉션 이미 존재");
  }
}

async function createRecord(token, collection, body) {
  const res = await pbFetch(`/api/collections/${collection}/records`, {
    method: "POST",
    headers: { Authorization: token },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${collection} create failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log("[PB Upload] PocketBase 설계사/매니저 데이터 업로드 시작...");

  const token = await adminAuth();
  console.log("  [PB] Admin 인증 완료");

  await ensureCollections(token);

  const dataPath = path.join(__dirname, "..", "src", "data", "data.json");
  if (!fs.existsSync(dataPath)) {
    throw new Error("src/data/data.json not found");
  }
  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const managers = new Map();
  let count = 0;

  for (const agent of data) {
    if (agent.code === RANK_EXCLUDE_CODE) continue;
    const body = {
      code: String(agent.code),
      name: agent.name,
      branch: agent.branch || "",
      password: String(agent.code),
      performance: agent.performance || {},
      weekly: agent.weekly || {},
      managerCode: agent.managerCode || "",
      managerName: agent.managerName || "",
      role: "agent",
      isFirstLogin: true,
      targetManagerCode: null,
    };
    await createRecord(token, "agents", body);
    count++;
    if (agent.managerCode && agent.managerCode !== "UNKNOWN") {
      managers.set(agent.managerCode, agent.managerName);
    }
    if (count % 100 === 0) console.log(`  설계사 ${count}건 업로드...`);
  }
  console.log(`  설계사 ${count}건 업로드 완료`);

  for (const [mCode, mName] of managers.entries()) {
    await createRecord(token, "agents", {
      code: String(mCode),
      name: mName,
      password: String(mCode),
      isFirstLogin: true,
      role: "manager",
      branch: null,
      performance: {},
      weekly: {},
      managerCode: null,
      managerName: null,
      targetManagerCode: null,
    });
    count++;
  }

  await createRecord(token, "agents", {
    code: "312345678",
    name: "관리 매니저",
    password: "312345678",
    isFirstLogin: true,
    role: "manager",
    targetManagerCode: "322006468",
    branch: null,
    performance: {},
    weekly: {},
    managerCode: null,
    managerName: null,
  });
  count++;

  await createRecord(token, "agents", {
    code: "121202739",
    name: "테스트관리자",
    password: "121202739",
    isFirstLogin: true,
    role: "admin",
    branch: null,
    performance: {},
    weekly: {},
    managerCode: null,
    managerName: null,
    targetManagerCode: null,
  });
  count++;

  const configList = await pbFetch("/api/collections/config/records?perPage=1", { headers: { Authorization: token } });
  const configData = await configList.json();
  const configItems = configData.items || [];
  if (configItems.length === 0) {
    await createRecord(token, "config", { key: "app", updateDate: "0000" });
    console.log("  [PB] config.app (updateDate) 생성됨");
  }

  console.log(`[PB Upload] 완료. 총 ${count}건(설계사+매니저+관리자) 업로드됨.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
