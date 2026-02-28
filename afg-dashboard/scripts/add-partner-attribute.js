/**
 * agents 컬렉션에 partner 속성만 추가 (이미 DB/컬렉션 있는 경우 한 번만 실행)
 *
 * 실행: node scripts/add-partner-attribute.js
 */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
require('dotenv').config({ path: envPath });

const { Client, Databases } = require('node-appwrite');

async function main() {
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const agentsCollId = process.env.APPWRITE_AGENTS_COLLECTION_ID;
  const key = process.env.APPWRITE_API_KEY;
  if (!key || !databaseId || !agentsCollId) {
    console.error('APPWRITE_API_KEY, APPWRITE_DATABASE_ID, APPWRITE_AGENTS_COLLECTION_ID 가 .env.local 에 필요합니다.');
    process.exit(1);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '69a11879001bc4449874')
    .setKey(key);
  const db = new Databases(client);

  try {
    await db.createStringAttribute(databaseId, agentsCollId, 'partner', 65535, false);
    console.log('[OK] agents 컬렉션에 partner 속성 추가됨.');
  } catch (e) {
    if (e.code === 409 || (e.message && e.message.includes('already exists'))) {
      console.log('[OK] partner 속성이 이미 있습니다. 별도 작업 없음.');
    } else {
      throw e;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
