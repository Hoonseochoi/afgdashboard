/**
 * Appwrite 일일(0227 등) 반영
 * - data/daily 폴더의 최신 NNNNMC_LIST*.xlsx 파싱
 * - config (key=app) updateDate 갱신
 * - agents 컬렉션에 당월/전월 실적, 주차 실적 merge
 * - src/data/agent-order.json 저장 (MC_LIST 순서)
 *
 * 필요: .env.local (APPWRITE_*), xlsx
 * 실행: node scripts/appwrite-upload-daily.js
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

const { Client, Databases, Query, ID } = require('node-appwrite');

const IDX_CODE = 5;
const IDX_NAME = 6;
const IDX_CURRENT = 10;
const IDX_PREV = 18;
const IDX_W1 = 20;
const IDX_W2 = 21;
const IDX_W3 = 22;
const IDX_W4 = 23;
const IDX_BRANCH = 37;

function findLatestTwoDailyFiles() {
  const dailyDir = path.join(__dirname, '..', '..', 'data', 'daily');
  if (!fs.existsSync(dailyDir)) return { latest: null, prev: null };

  // NNNNMC_LIST*.xlsx 패턴만 대상으로 함
  const files = fs
    .readdirSync(dailyDir)
    .filter((f) => /^\d{4}MC_LIST/i.test(f) && /\.xlsx?$/i.test(f))
    .sort();

  if (files.length === 0) return { latest: null, prev: null };

  // 가장 최신 파일 (예: 0227MC_LIST...)
  const latest = files[files.length - 1];
  const latestPrefix = latest.slice(0, 4); // '0227'

  // D-1 날짜(예: 0226)에 해당하는 파일을 찾는다.
  const latestNum = parseInt(latestPrefix, 10);
  const prevPrefix = Number.isFinite(latestNum) ? String(latestNum - 1).padStart(4, '0') : null;

  let prev = null;
  if (prevPrefix) {
    prev = files.find((f) => f.startsWith(prevPrefix)) ?? null;
  }

  return {
    latest: path.join(dailyDir, latest),
    prev: prev ? path.join(dailyDir, prev) : null,
  };
}

function parseMonthFromFilename(filename) {
  const match = filename.match(/_(\d{6})\.xlsx?$/i) || filename.match(/(\d{6})\.xlsx?$/i);
  if (!match) return { current: '2026-02', prev: '2026-01' };
  const ym = match[1];
  const y = ym.slice(0, 4);
  const m = parseInt(ym.slice(4), 10);
  const current = `${y}-${String(m).padStart(2, '0')}`;
  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? String(parseInt(y, 10) - 1) : y;
  const prev = `${prevY}-${String(prevM).padStart(2, '0')}`;
  return { current, prev };
}

/** 헤더 행에서 열 제목으로 인덱스 찾기. 없으면 기본값 반환 */
function findCol(headerRow, keywords, defaultIdx) {
  if (!Array.isArray(headerRow)) return defaultIdx;
  for (let c = 0; c < headerRow.length; c++) {
    const cell = String(headerRow[c] ?? '').trim();
    if (keywords.some((kw) => cell.includes(kw))) return c;
  }
  return defaultIdx;
}

function parseDailyXlsx(filePath) {
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: 0 });
  let headerRow = 0;
  for (let r = 0; r < Math.min(15, rows.length); r++) {
    const row = rows[r];
    if (Array.isArray(row) && row.some((c) => String(c).includes('인정실적') || String(c).includes('당월실적') || String(c).includes('사용인코드'))) {
      headerRow = r;
      break;
    }
  }
  const h = rows[headerRow] || [];
  const idxCode = findCol(h, ['사용인코드', '코드'], IDX_CODE);
  const idxName = findCol(h, ['설계사명', '이름'], IDX_NAME);
  const idxCurrent = findCol(h, ['인정실적', '인정 실적', '당월실적'], IDX_CURRENT);
  const idxPrev = findCol(h, ['전월실적'], IDX_PREV);
  const idxW1 = findCol(h, ['1주차'], IDX_W1);
  const idxW2 = findCol(h, ['2주차'], IDX_W2);
  const idxW3 = findCol(h, ['3주차'], IDX_W3);
  const idxW4 = findCol(h, ['4주차'], IDX_W4);
  const idxBranch = findCol(h, ['지사명'], IDX_BRANCH);

  const result = [];
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const branch = String(row[idxBranch] ?? '').trim();
    if (!branch.includes('어센틱')) continue;
    const code = String(row[idxCode] ?? '').trim();
    if (!code || code.length < 5) continue;
    const name = String(row[idxName] ?? '').trim() || code;
    const rawCurrent = row[idxCurrent];
    const rawW1 = row[idxW1];
    const currentMonth = Number(rawCurrent) || (typeof rawCurrent === 'string' ? Number(String(rawCurrent).replace(/[,\s]/g, '')) || 0 : 0);
    const prevMonth = Number(row[idxPrev]) || 0;
    const week1 = Number(rawW1) || (typeof rawW1 === 'string' ? Number(String(rawW1).replace(/[,\s]/g, '')) || 0 : 0);
    const week2 = Number(row[idxW2]) || 0;
    const week3 = Number(row[idxW3]) || 0;
    const week4 = Number(row[idxW4]) || 0;
    result.push({
      code,
      name,
      branch,
      currentMonth,
      prevMonth,
      week1,
      week2,
      week3,
      week4,
    });
  }
  return result;
}

async function getAgentByCode(db, databaseId, collectionId, code) {
  const res = await db.listDocuments(databaseId, collectionId, [Query.equal('code', [String(code)]), Query.limit(1)]);
  const list = res.documents || [];
  return list.length > 0 ? list[0] : null;
}

async function main() {
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const agentsCollId = process.env.APPWRITE_AGENTS_COLLECTION_ID;
  const configCollId = process.env.APPWRITE_CONFIG_COLLECTION_ID;
  const key = process.env.APPWRITE_API_KEY;
  if (!key || !databaseId || !agentsCollId || !configCollId) {
    throw new Error('APPWRITE_API_KEY, APPWRITE_DATABASE_ID, APPWRITE_AGENTS_COLLECTION_ID, APPWRITE_CONFIG_COLLECTION_ID required');
  }

  const files = findLatestTwoDailyFiles();
  const filePath = files.latest;
  if (!filePath) {
    console.error('  data/daily 폴더에 NNNNMC_LIST*.xlsx 파일이 없습니다.');
    process.exit(1);
  }

  const fileName = path.basename(filePath);
  const updateDate = fileName.substring(0, 4);
  const { current: currentMonthKey, prev: prevMonthKey } = parseMonthFromFilename(fileName);
  console.log('[Appwrite Daily] 파일:', fileName, '→ updateDate:', updateDate, '당월:', currentMonthKey, '전월:', prevMonthKey);

  const rows = parseDailyXlsx(filePath);
  console.log('  어센틱금융그룹 설계사', rows.length, '명 파싱됨');

  // 전일 파일이 있으면 전일 인보험 누적 실적과의 차이(전일비)를 계산한다.
  let prevMap = new Map();
  if (files.prev) {
    try {
      const prevRows = parseDailyXlsx(files.prev);
      prevMap = new Map(prevRows.map((r) => [r.code, r]));
    } catch (e) {
      console.error('  전일 파일 파싱 중 오류(무시):', e);
    }
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '69a11879001bc4449874')
    .setKey(key);
  const db = new Databases(client);

  const configRes = await db.listDocuments(databaseId, configCollId, [Query.equal('key', ['app']), Query.limit(1)]);
  const configList = configRes.documents || [];
  if (configList.length > 0) {
    await db.updateDocument(databaseId, configCollId, configList[0].$id, { updateDate });
  } else {
    await db.createDocument(databaseId, configCollId, ID.unique(), { key: 'app', updateDate });
  }
  console.log('  config.app.updateDate =', updateDate);

  let updated = 0;
  let created = 0;
  const orderedCodes = [];
  const dailyDiffKey = `${currentMonthKey}-diff`;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    orderedCodes.push(row.code);
    const prevRow = prevMap.get(row.code);
    const prevCurrent = prevRow ? prevRow.currentMonth : row.currentMonth;
    const dailyDiff = row.currentMonth - prevCurrent;

    const agent = await getAgentByCode(db, databaseId, agentsCollId, row.code);
    if (!agent) {
      const performance = {
        [currentMonthKey]: row.currentMonth,
        [prevMonthKey]: row.prevMonth,
        [dailyDiffKey]: dailyDiff,
      };
      const weekly = { week1: row.week1, week2: row.week2, week3: row.week3, week4: row.week4 };
      await db.createDocument(databaseId, agentsCollId, ID.unique(), {
        code: row.code,
        name: row.name,
        branch: row.branch || '',
        password: row.code,
        role: 'agent',
        isFirstLogin: true,
        performance: JSON.stringify(performance),
        weekly: JSON.stringify(weekly),
        managerCode: null,
        managerName: null,
        targetManagerCode: null,
      });
      created++;
    } else {
      const basePerf = agent.performance ? JSON.parse(agent.performance) : {};
      const performance = {
        ...basePerf,
        [currentMonthKey]: row.currentMonth,
        [prevMonthKey]: row.prevMonth,
        [dailyDiffKey]: dailyDiff,
      };
      const weekly = { week1: row.week1, week2: row.week2, week3: row.week3, week4: row.week4 };
      await db.updateDocument(databaseId, agentsCollId, agent.$id, {
        performance: JSON.stringify(performance),
        weekly: JSON.stringify(weekly),
      });
      updated++;
    }
    if ((i + 1) % 500 === 0) console.log('  ', i + 1, '건 처리...');
  }

  const orderPath = path.join(__dirname, '..', 'src', 'data', 'agent-order.json');
  fs.writeFileSync(orderPath, JSON.stringify({ updateDate, codes: orderedCodes }, null, 2), 'utf8');
  console.log('  agent-order.json 저장 (MC_LIST 순서,', orderedCodes.length, '명)');
  console.log('[Appwrite Daily] 완료. updateDate:', updateDate, '실적 반영:', updated, '건, 신규 생성:', created);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
