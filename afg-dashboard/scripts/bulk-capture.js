/**
 * 전체 설계사 대시보드 PNG 일괄 캡처
 * - 로그인 없이 data/capture/dashboard.json + 로컬 서버 ?capture=1 사용
 * - 저장: [출력폴더]/[지사명]/[매니저명]/[설계사명].png
 *
 * 사전 준비:
 *   1) data/capture/dashboard.json 존재 (scripts/capture-dump-dashboard.js 로 1회 생성)
 *   2) dev 서버 실행 중: npm run dev (port 3001)
 *
 * 사용: node scripts/bulk-capture.js [출력폴더] [최대개수] [direct]
 *   출력폴더 기본: data/capture/output
 *   최대개수 생략 시 전원 캡처. 테스트: node scripts/bulk-capture.js "" 10
 *   direct: 다이렉트(비파트너) TOP 50명만 캡처 (dashboard.json에 directRanks 필요)
 */
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.CAPTURE_BASE_URL || 'http://localhost:3001';
const CAPTURE_URL = process.env.CAPTURE_URL || `${BASE_URL}/?capture=1`;
const arg1 = process.argv[2];
const arg2 = process.argv[3];
const arg3 = process.argv[4];
const isNum = (s) => s != null && /^\d+$/.test(String(s));
const isDirectMode = arg3 === 'direct' || arg2 === 'direct' || process.env.CAPTURE_DIRECT === '1';
const OUT_DIR = path.resolve(
  arg1 && !isNum(arg1) && arg1 !== 'direct' ? arg1 : path.join(__dirname, '..', 'data', 'capture', 'output')
);
const LIMIT = process.env.CAPTURE_LIMIT != null
  ? parseInt(process.env.CAPTURE_LIMIT, 10)
  : (isDirectMode ? 50 : (isNum(arg2) ? parseInt(arg2, 10) : isNum(arg1) ? parseInt(arg1, 10) : null));

const RANK_EXCLUDE_CODE = '712345678';

function sanitize(name) {
  if (name == null || name === '') return '미지정';
  return String(name)
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || '미지정';
}

async function loadPayload() {
  try {
    const res = await fetch(BASE_URL + '/api/capture-data');
    if (res.ok) {
      const data = await res.json();
      if (data.agents && data.agents.length > 0) {
        console.log('최신 데이터 사용 (API): agents', data.agents.length, 'updateDate:', data.updateDate || '-');
        return data;
      }
    }
  } catch (e) {
    console.warn('API 조회 실패, 파일 사용:', e.message);
  }
  const dataPath = path.join(__dirname, '..', 'data', 'capture', 'dashboard.json');
  if (!fs.existsSync(dataPath)) {
    return null;
  }
  const payload = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log('파일 데이터 사용 (dashboard.json): agents', (payload.agents || []).length);
  return payload;
}

async function main() {
  const puppeteer = require('puppeteer');
  const payload = await loadPayload();
  if (!payload || !payload.agents || payload.agents.length === 0) {
    console.error('캡처할 데이터가 없습니다. dev 서버를 켜두면 최신 DB 기준으로 캡처됩니다. Supabase 미설정 시 data/capture/dashboard.json 을 capture-dump-dashboard.js 로 생성하세요.');
    process.exit(1);
  }
  const allAgents = (payload.agents || []).filter((a) => a.code !== RANK_EXCLUDE_CODE);
  if (allAgents.length === 0) {
    console.error('캡처할 설계사가 없습니다.');
    process.exit(1);
  }

  let agents;
  let indices; // agents[i]를 캡처할 때 사용할 __CAPTURE_SELECT(인덱스)
  if (isDirectMode) {
    const isPartner = (a) => a.branch && String(a.branch).includes('파트너');
    const getMarch = (a) => (a.performance && a.performance['2026-03']) || 0;
    let directRanks = (payload.directRanks || []).filter((a) => a.code !== RANK_EXCLUDE_CODE);
    if (directRanks.length === 0) {
      directRanks = allAgents.filter((a) => !isPartner(a)).sort((a, b) => getMarch(b) - getMarch(a));
    }
    const codeToIndex = Object.fromEntries(allAgents.map((a, i) => [a.code, i]));
    const directTop = directRanks.slice(0, LIMIT || 50);
    agents = directTop.filter((a) => codeToIndex[a.code] !== undefined);
    indices = agents.map((a) => codeToIndex[a.code]);
    if (agents.length === 0) {
      console.error('다이렉트 TOP 목록이 비었습니다. agents에 비파트너 설계사가 있는지 확인하세요.');
      process.exit(1);
    }
    console.log('다이렉트 TOP', agents.length, '명 캡처합니다.');
  } else {
    agents = LIMIT != null && LIMIT > 0 ? allAgents.slice(0, LIMIT) : allAgents;
    indices = agents.map((_, i) => i);
    if (LIMIT != null && LIMIT > 0) {
      console.log('테스트 모드: 상위', LIMIT, '명만 캡처합니다.');
    }
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });

  const capturePath = isDirectMode ? '/direct?capture=1' : '/?capture=1';
  const url = BASE_URL + capturePath;
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));
  } catch (e) {
    console.error('페이지 로드 실패. dev 서버가 켜져 있는지 확인하세요:', e.message);
    await browser.close();
    process.exit(1);
  }

  // __CAPTURE_SELECT / __CAPTURE_GET_PNG 준비될 때까지 대기
  await page.waitForFunction(
    () => typeof window.__CAPTURE_SELECT === 'function' && typeof window.__CAPTURE_GET_PNG === 'function',
    { timeout: 15000 }
  ).catch(() => {
    console.error('캡처 API가 준비되지 않았습니다. capture=1 페이지와 data/capture/dashboard.json을 확인하세요.');
    process.exit(1);
  });

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const selectIndex = indices[i];
    const branch = sanitize(agent.branch);
    const managerName = sanitize(agent.managerName || agent.manager_name || '');
    const name = sanitize(agent.name);
    const dir = path.join(OUT_DIR, branch, managerName);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${name}.png`);

    try {
      await page.evaluate((index) => window.__CAPTURE_SELECT(index), selectIndex);
    } catch (e) {
      if (String(e.message).includes('destroyed')) {
        console.warn(`[${i + 1}/${agents.length}] ${agent.name} - 컨텍스트 종료, 스킵`);
        continue;
      }
      throw e;
    }
    await new Promise((r) => setTimeout(r, 600));

    let dataUrl;
    try {
      dataUrl = await page.evaluate(async () => (await window.__CAPTURE_GET_PNG()) || '');
    } catch (e) {
      if (String(e.message).includes('destroyed')) {
        console.warn(`[${i + 1}/${agents.length}] ${agent.name} - PNG 생성 시 컨텍스트 종료, 스킵`);
        continue;
      }
      throw e;
    }
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      console.warn(`[${i + 1}/${agents.length}] ${agent.name} - PNG 생성 실패, 스킵`);
      continue;
    }
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
    console.log(`[${i + 1}/${agents.length}] ${filePath}`);
  }

  await browser.close();
  console.log('캡처 완료. 출력:', OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
