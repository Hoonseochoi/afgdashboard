/**
 * 전체 설계사 대시보드 PNG 일괄 캡처
 * - 로그인 없이 data/capture/dashboard.json + 로컬 서버 ?capture=1 사용
 * - 저장: [출력폴더]/[지사명]/[매니저명]/[설계사명].png
 *
 * 사전 준비:
 *   1) data/capture/dashboard.json 존재 (scripts/capture-dump-dashboard.js 로 1회 생성)
 *   2) dev 서버 실행 중: npm run dev (port 3001)
 *
 * 사용: node scripts/bulk-capture.js [출력폴더] [최대개수]
 *   출력폴더 기본: data/capture/output
 *   최대개수 생략 시 전원 캡처. 테스트: node scripts/bulk-capture.js "" 10
 */
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.CAPTURE_BASE_URL || 'http://localhost:3001';
const CAPTURE_URL = `${BASE_URL}/?capture=1`;
const arg1 = process.argv[2];
const arg2 = process.argv[3];
const isNum = (s) => s != null && /^\d+$/.test(String(s));
const OUT_DIR = path.resolve(
  arg1 && !isNum(arg1) ? arg1 : path.join(__dirname, '..', 'data', 'capture', 'output')
);
const LIMIT = process.env.CAPTURE_LIMIT != null
  ? parseInt(process.env.CAPTURE_LIMIT, 10)
  : (isNum(arg2) ? parseInt(arg2, 10) : isNum(arg1) ? parseInt(arg1, 10) : null);

const RANK_EXCLUDE_CODE = '712345678';

function sanitize(name) {
  if (name == null || name === '') return '미지정';
  return String(name)
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || '미지정';
}

async function main() {
  const puppeteer = require('puppeteer');
  const dataPath = path.join(__dirname, '..', 'data', 'capture', 'dashboard.json');
  if (!fs.existsSync(dataPath)) {
    console.error('data/capture/dashboard.json 이 없습니다. scripts/capture-dump-dashboard.js 를 먼저 실행하세요.');
    process.exit(1);
  }
  const payload = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  let agents = (payload.agents || []).filter((a) => a.code !== RANK_EXCLUDE_CODE);
  if (agents.length === 0) {
    console.error('캡처할 설계사가 없습니다.');
    process.exit(1);
  }
  if (LIMIT != null && LIMIT > 0) {
    agents = agents.slice(0, LIMIT);
    console.log('테스트 모드: 상위', LIMIT, '명만 캡처합니다.');
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });

  try {
    await page.goto(CAPTURE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
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
    const branch = sanitize(agent.branch);
    const managerName = sanitize(agent.managerName || agent.manager_name || '');
    const name = sanitize(agent.name);
    const dir = path.join(OUT_DIR, branch, managerName);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${name}.png`);

    await page.evaluate((index) => window.__CAPTURE_SELECT(index), i);
    await new Promise((r) => setTimeout(r, 400));

    const dataUrl = await page.evaluate(async () => (await window.__CAPTURE_GET_PNG()) || '');
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
