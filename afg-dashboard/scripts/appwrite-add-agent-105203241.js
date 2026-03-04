/**
 * Appwrite agents 컬렉션에 코드 105203241 레코드 보정/추가
 * - .env.local 의 APPWRITE_* 설정을 사용
 * - 이미 존재하면 name/password/role/isFirstLogin만 보정
 * - 없으면 기본 값으로 새 문서 생성
 *
 * 실행: node scripts/appwrite-add-agent-105203241.js
 */

const path = require("path");
const fs = require("fs");
const { Client, Databases, Query, ID } = require("node-appwrite");

// .env.local 로드 (appwrite-upload-daily.js와 동일 방식)
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
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    )
      val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
require("dotenv").config({ path: envPath });

async function main() {
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const agentsCollId = process.env.APPWRITE_AGENTS_COLLECTION_ID;
  const key = process.env.APPWRITE_API_KEY;

  if (!key || !databaseId || !agentsCollId) {
    throw new Error(
      "APPWRITE_API_KEY, APPWRITE_DATABASE_ID, APPWRITE_AGENTS_COLLECTION_ID required",
    );
  }

  const client = new Client()
    .setEndpoint(
      process.env.APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1",
    )
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(key);
  const db = new Databases(client);

  const code = "105203241";
  const name = "이진영 지점장";
  const defaultPassword = "105203241";

  console.log("[AddAgent] checking agent code:", code);
  const existing = await db.listDocuments(databaseId, agentsCollId, [
    Query.equal("code", [code]),
    Query.limit(1),
  ]);
  const docs = existing.documents || [];

  if (docs.length > 0) {
    const doc = docs[0];
    console.log("[AddAgent] existing document found:", doc.$id);
    const update = {};
    // 이름은 항상 최신 값으로 맞춰 준다.
    update.name = name;
    if (!doc.password) update.password = defaultPassword;
    if (!doc.role) update.role = "agent";
    if (doc.isFirstLogin === undefined) update.isFirstLogin = true;

    if (Object.keys(update).length > 0) {
      await db.updateDocument(databaseId, agentsCollId, doc.$id, update);
      console.log("[AddAgent] document updated:", update);
    } else {
      console.log("[AddAgent] nothing to update.");
    }
  } else {
    console.log("[AddAgent] no document found. Creating new one...");
    await db.createDocument(
      databaseId,
      agentsCollId,
      ID.unique(),
      {
        code,
        name,
        password: defaultPassword,
        // performance, weekly, partner 등은 서버 코드에서 JSON 문자열을 기대하므로 빈 문자열로 둔다.
        performance: "",
        weekly: "",
        partner: "",
        branch: "",
        role: "agent",
        isFirstLogin: true,
      },
    );
    console.log("[AddAgent] new agent document created for code", code);
  }
}

main().catch((e) => {
  console.error("[AddAgent] error:", e);
  process.exit(1);
});

