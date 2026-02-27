/**
 * Appwrite에 설계사·매니저·관리자 데이터 업로드 (배치 + 병렬로 빠르게)
 * - 기존 문서 한 번에 조회 → 생성은 100건씩 배치, 수정은 병렬
 *
 * 실행: node scripts/appwrite-upload-agents.js
 */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8').replace(/\r\n/g, '\n');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim().replace(/^\uFEFF/, '');
    const val = trimmed.slice(eq + 1).trim();
    if (key === 'APPWRITE_API_KEY') process.env.APPWRITE_API_KEY = val;
    else if (key.startsWith('APPWRITE_')) process.env[key] = val;
  }
}
require('dotenv').config({ path: envPath });

const { Client, Databases, Query, ID } = require('node-appwrite');
const RANK_EXCLUDE_CODE = '712345678';
const BATCH_CREATE_SIZE = 100;
const BATCH_UPDATE_CONCURRENCY = 30;

function getClient() {
  const endpoint = (process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1').trim();
  const project = (process.env.APPWRITE_PROJECT_ID || '').trim();
  const key = (process.env.APPWRITE_API_KEY || '').trim();
  if (!project || !key) throw new Error('APPWRITE_PROJECT_ID, APPWRITE_API_KEY 필요');
  return new Client().setEndpoint(endpoint).setProject(project).setKey(key);
}

async function listAllAgentCodes(db, databaseId, collectionId) {
  const map = new Map();
  let offset = 0;
  const limit = 100;
  while (true) {
    const res = await db.listDocuments(databaseId, collectionId, [Query.limit(limit), Query.offset(offset)]);
    const docs = res.documents || [];
    for (const d of docs) {
      if (d.code) map.set(String(d.code), d.$id);
    }
    if (docs.length < limit) break;
    offset += limit;
  }
  return map;
}

function toBody(agent, role = 'agent') {
  const performance = agent.performance || {};
  const weekly = agent.weekly || {};
  return {
    code: String(agent.code),
    name: agent.name || agent.code,
    branch: (agent.branch || '').substring(0, 512),
    password: String(agent.code),
    performance: JSON.stringify(performance),
    weekly: JSON.stringify(weekly),
    managerCode: agent.managerCode || '',
    managerName: agent.managerName || '',
    role,
    isFirstLogin: true,
    targetManagerCode: agent.targetManagerCode ?? null,
  };
}

async function main() {
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const agentsCollId = process.env.APPWRITE_AGENTS_COLLECTION_ID;
  const configCollId = process.env.APPWRITE_CONFIG_COLLECTION_ID;
  if (!databaseId || !agentsCollId || !configCollId) {
    throw new Error('APPWRITE_DATABASE_ID, APPWRITE_AGENTS_COLLECTION_ID, APPWRITE_CONFIG_COLLECTION_ID 필요');
  }

  console.log('[Appwrite Upload] 설계사/매니저 데이터 업로드 시작...');
  const client = getClient();
  const db = new Databases(client);

  console.log('  기존 agents 목록 조회 중...');
  const existingByCode = await listAllAgentCodes(db, databaseId, agentsCollId);
  console.log('  기존', existingByCode.size, '건 확인');

  const dataPath = path.join(__dirname, '..', 'src', 'data', 'data.json');
  if (!fs.existsSync(dataPath)) throw new Error('src/data/data.json not found');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const toCreate = [];
  const toUpdate = [];
  const managers = new Map();

  for (const agent of data) {
    if (agent.code === RANK_EXCLUDE_CODE) continue;
    const body = toBody(agent);
    if (existingByCode.has(String(agent.code))) {
      toUpdate.push({ $id: existingByCode.get(String(agent.code)), ...body });
    } else {
      toCreate.push({ $id: ID.unique(), ...body });
    }
    if (agent.managerCode && agent.managerCode !== 'UNKNOWN') managers.set(agent.managerCode, agent.managerName);
  }

  const managerEntries = [
    { code: '312345678', name: '관리 매니저', role: 'manager', targetManagerCode: '322006468' },
    { code: '121202739', name: '테스트관리자', role: 'admin', targetManagerCode: null },
  ];
  for (const [mCode, mName] of managers.entries()) {
    const code = String(mCode);
    const body = toBody({ code, name: mName, managerCode: '', managerName: '' }, 'manager');
    body.managerCode = '';
    body.managerName = '';
    if (existingByCode.has(code)) toUpdate.push({ $id: existingByCode.get(code), ...body });
    else toCreate.push({ $id: ID.unique(), ...body });
  }
  for (const m of managerEntries) {
    const body = toBody(m, m.role);
    body.targetManagerCode = m.targetManagerCode;
    if (existingByCode.has(m.code)) toUpdate.push({ $id: existingByCode.get(m.code), ...body });
    else toCreate.push({ $id: ID.unique(), ...body });
  }

  let created = 0;
  for (let i = 0; i < toCreate.length; i += BATCH_CREATE_SIZE) {
    const chunk = toCreate.slice(i, i + BATCH_CREATE_SIZE);
    await db.createDocuments(databaseId, agentsCollId, chunk);
    created += chunk.length;
    console.log('  생성', created, '/', toCreate.length);
  }

  for (let i = 0; i < toUpdate.length; i += BATCH_UPDATE_CONCURRENCY) {
    const chunk = toUpdate.slice(i, i + BATCH_UPDATE_CONCURRENCY);
    await Promise.all(
      chunk.map((doc) => {
        const { $id, ...data } = doc;
        return db.updateDocument(databaseId, agentsCollId, $id, data);
      })
    );
    if ((i + chunk.length) % 200 === 0 || i + chunk.length === toUpdate.length) {
      console.log('  수정', Math.min(i + BATCH_UPDATE_CONCURRENCY, toUpdate.length), '/', toUpdate.length);
    }
  }

  const configRes = await db.listDocuments(databaseId, configCollId, [Query.equal('key', ['app']), Query.limit(1)]);
  if ((configRes.documents || []).length === 0) {
    await db.createDocument(databaseId, configCollId, ID.unique(), { key: 'app', updateDate: '0000' });
    console.log('  config.app 생성됨');
  }

  console.log('[Appwrite Upload] 완료. 생성', toCreate.length, '건, 수정', toUpdate.length, '건');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
