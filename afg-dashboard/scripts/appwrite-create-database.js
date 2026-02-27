/**
 * Appwrite 데이터베이스 + agents/config 컬렉션 생성
 * - DB가 없으면 생성, 있으면 그대로 사용
 * - agents, config 컬렉션과 속성 생성
 *
 * 필요: .env.local (APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY)
 * APPWRITE_DATABASE_ID 가 있으면 그 ID로 DB 생성 시도, 없으면 'afg_db' 사용
 *
 * 실행: node scripts/appwrite-create-database.js
 */
const path = require('path');
const fs = require('fs');

const envPath = fs.existsSync(path.join(process.cwd(), '.env.local'))
  ? path.join(process.cwd(), '.env.local')
  : path.join(__dirname, '..', '.env.local');
require('dotenv').config({ path: envPath, override: true });
// .env.local 직접 파싱 (긴 API 키 등 dotenv가 누락할 수 있는 값 보강)
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8').replace(/\r\n/g, '\n');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim().replace(/^\uFEFF/, '');
    const val = trimmed.slice(eq + 1).trim();
    if (key === 'APPWRITE_PROJECT_ID') process.env.APPWRITE_PROJECT_ID = val;
    else if (key === 'APPWRITE_API_KEY') process.env.APPWRITE_API_KEY = val;
    else if (key.startsWith('APPWRITE_')) process.env[key] = val;
  }
}

const { Client, Databases, ID } = require('node-appwrite');

const DB_ID = process.env.APPWRITE_DATABASE_ID || 'afg_db';
const AGENTS_COLLECTION_ID = 'agents';
const CONFIG_COLLECTION_ID = 'config';

function getClient() {
  const endpoint = (process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1').trim();
  const project = (process.env.APPWRITE_PROJECT_ID || '').trim();
  const key = (process.env.APPWRITE_API_KEY || '').trim();
  if (!project) throw new Error('APPWRITE_PROJECT_ID 필요 (.env.local 확인)');
  if (!key) throw new Error('APPWRITE_API_KEY 필요 (.env.local 확인)');
  return new Client().setEndpoint(endpoint).setProject(project).setKey(key);
}

async function ensureDatabase(db) {
  try {
    await db.get(DB_ID);
    console.log('  [OK] 데이터베이스 사용:', DB_ID);
    return DB_ID;
  } catch (e) {
    if (e.code === 404) {
      try {
        const created = await db.create(DB_ID, 'afg', true);
        console.log('  [OK] 데이터베이스 생성:', created.$id);
        return created.$id;
      } catch (createErr) {
        if (createErr.code === 403 && createErr.message && createErr.message.includes('maximum number of databases')) {
          console.log('  [경고] 플랜 DB 개수 제한으로 새 DB 생성 불가. 콘솔에서 DB를 만든 뒤 같은 APPWRITE_DATABASE_ID 를 .env.local 에 넣으세요.');
          throw new Error('DB 개수 제한. Appwrite 콘솔에서 Database를 먼저 생성하고, 그 Database ID를 APPWRITE_DATABASE_ID에 넣은 뒤 다시 실행하세요.');
        }
        throw createErr;
      }
    }
    throw e;
  }
}

async function ensureCollection(db, collectionId, name) {
  try {
    await db.getCollection(DB_ID, collectionId);
    console.log('  [OK] 컬렉션 이미 존재:', collectionId);
    return;
  } catch (e) {
    if (e.code !== 404) throw e;
  }
  await db.createCollection(DB_ID, collectionId, name);
  console.log('  [OK] 컬렉션 생성:', collectionId);
}

async function addStringAttr(db, collId, key, size, required) {
  try {
    await db.createStringAttribute(DB_ID, collId, key, size, required);
    console.log('    속성 추가:', key);
  } catch (e) {
    if (e.code === 409 || (e.message && e.message.includes('already exists'))) return;
    throw e;
  }
}

async function addBoolAttr(db, collId, key, required) {
  try {
    await db.createBooleanAttribute(DB_ID, collId, key, required);
    console.log('    속성 추가:', key);
  } catch (e) {
    if (e.code === 409 || (e.message && e.message.includes('already exists'))) return;
    throw e;
  }
}

async function main() {
  console.log('[Appwrite] 데이터베이스·컬렉션 생성 시작...\n');

  const client = getClient();
  const db = new Databases(client);

  await ensureDatabase(db);
  console.log('');

  await ensureCollection(db, AGENTS_COLLECTION_ID, 'agents');
  const agentAttrs = [
    ['code', 64, true],
    ['name', 256, false],
    ['password', 256, false],
    ['role', 32, false],
    ['performance', 16384, false],
    ['weekly', 8192, false],
    ['managerCode', 64, false],
    ['managerName', 256, false],
    ['branch', 512, false],
    ['targetManagerCode', 64, false],
  ];
  for (const [key, size, required] of agentAttrs) {
    await addStringAttr(db, AGENTS_COLLECTION_ID, key, size, required);
  }
  await addBoolAttr(db, AGENTS_COLLECTION_ID, 'isFirstLogin', false);
  console.log('');

  await ensureCollection(db, CONFIG_COLLECTION_ID, 'config');
  await addStringAttr(db, CONFIG_COLLECTION_ID, 'key', 64, true);
  await addStringAttr(db, CONFIG_COLLECTION_ID, 'updateDate', 32, false);
  console.log('');

  console.log('[Appwrite] 완료.\n');
  console.log('  아래 값을 .env.local 에 넣으세요 (없는 것만):\n');
  console.log('  APPWRITE_DATABASE_ID=' + DB_ID);
  console.log('  APPWRITE_AGENTS_COLLECTION_ID=' + AGENTS_COLLECTION_ID);
  console.log('  APPWRITE_CONFIG_COLLECTION_ID=' + CONFIG_COLLECTION_ID);
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
