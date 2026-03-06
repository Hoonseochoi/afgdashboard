/**
 * 지정 지사만 대상으로 대시보드 PNG 일괄 캡처 (엔타스4스튜디오 + 파트너채널)
 * - data/capture/dashboard.json 사용, 경로는 PLAN_BULK_CAPTURE.md 참고
 * - 저장: [출력베이스]/[날짜 YYYYMMDD]/[지사명]/[매니저명]/[설계사명].png
 *
 * 사전 준비:
 *   1) data/capture/dashboard.json (npm run capture:dump 또는 capture-dump-dashboard.js)
 *   2) dev 서버 실행 중: npm run dev (port 3001)
 *
 * 사용: node scripts/bulk-capture-branches.js [출력베이스폴더]
 *   출력베이스 기본: afg-dashboard/OUTPUT → OUTPUT/YYYYMMDD/지사/매니저/설계사.png
 */
const fs = require('fs');
const path = require('path');

/** 캡처 대상 지사명 (branch 문자열에 포함되면 해당) */
const BRANCHES = ['엔타스4스튜디오', '파트너채널'];

const MARCH_KEY = '2026-03';
const BASE_URL = process.env.CAPTURE_BASE_URL || 'http://localhost:3001';
const CAPTURE_URL = `${BASE_URL}/direct?capture=1`;

const argOut = process.argv[2];
const OUT_BASE = path.resolve(
  argOut && typeof argOut === 'string' && argOut.length > 0
    ? argOut
    : path.join(__dirname, '..', 'OUTPUT')
);

/** 오늘 날짜 YYYYMMDD */
function getDateFolder() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

const OUT_DIR = path.join(OUT_BASE, getDateFolder());

const RANK_EXCLUDE_CODE = '712345678';

function sanitize(name) {
  if (name == null || name === '') return '미지정';
  return String(name)
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || '미지정';
}

/** 한 지사에 대해 캡처 루프 실행 */
async function captureBranch(page, payload, branchLabel, outDir) {
  const allAgents = (payload.agents || []).filter((a) => a.code !== RANK_EXCLUDE_CODE);
  const entries = [];
  for (let i = 0; i < allAgents.length; i++) {
    const agent = allAgents[i];
    const branch = agent.branch || '';
    if (!branch.includes(branchLabel)) continue;
    const march = (agent.performance && agent.performance[MARCH_KEY]) ?? 0;
    if (march === 0) continue;
    entries.push({ index: i, agent });
  }

  if (entries.length === 0) {
    console.log('  [건너뜀]', branchLabel, '- 3월 실적 > 0인 인원 없음');
    return 0;
  }

  const branchDir = path.join(outDir, branchLabel);
  if (!fs.existsSync(branchDir)) fs.mkdirSync(branchDir, { recursive: true });
  console.log('  지사:', branchLabel, '| 캡처 인원:', entries.length, '| 출력:', branchDir);

  let saved = 0;
  for (let k = 0; k < entries.length; k++) {
    const { index, agent } = entries[k];
    const managerName = sanitize(agent.managerName || agent.manager_name || '미지정');
    const name = sanitize(agent.name);
    const dir = path.join(branchDir, managerName);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${name}.png`);

    // React 효과 타이밍: 캡처 API가 준비될 때까지 대기 (재렌더 후 재주입 대비)
    const selectReady = await page.waitForFunction(
      () => typeof window.__CAPTURE_SELECT === 'function',
      { timeout: 8000 }
    ).catch(() => null);
    if (!selectReady) {
      console.warn(`    [${k + 1}/${entries.length}] ${agent.name} - API 대기 타임아웃, 스킵`);
      continue;
    }
    await new Promise((r) => setTimeout(r, 400));

    let selectOk = false;
    try {
      await page.evaluate((idx) => window.__CAPTURE_SELECT(idx), index);
      selectOk = true;
    } catch (e) {
      // 한 번 재로드 후 재시도 (React 효과가 사라진 경우)
      try {
        await page.goto(CAPTURE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForFunction(
          () => typeof window.__CAPTURE_SELECT === 'function',
          { timeout: 15000 }
        );
        await new Promise((r) => setTimeout(r, 500));
        await page.evaluate((idx) => window.__CAPTURE_SELECT(idx), index);
        selectOk = true;
      } catch (e2) {
        console.warn(`    [${k + 1}/${entries.length}] ${agent.name} - SELECT 실패(재시도 후), 스킵:`, e2.message);
        continue;
      }
    }
    if (!selectOk) continue;
    await new Promise((r) => setTimeout(r, 1000));

    let dataUrl = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        dataUrl = await page.evaluate(async () => {
          if (typeof window.__CAPTURE_GET_PNG !== 'function') return '';
          return (await window.__CAPTURE_GET_PNG()) || '';
        });
        if (dataUrl && dataUrl.startsWith('data:image')) break;
      } catch (e) {
        if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
        else throw e;
      }
    }
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      console.warn(`    [${k + 1}/${entries.length}] ${agent.name} - PNG 실패, 스킵`);
      continue;
    }
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
    saved++;
    console.log(`    [${k + 1}/${entries.length}] ${filePath}`);
  }
  return saved;
}

async function main() {
  const puppeteer = require('puppeteer');
  const dataPath = path.join(__dirname, '..', 'data', 'capture', 'dashboard.json');
  if (!fs.existsSync(dataPath)) {
    console.error('data/capture/dashboard.json 이 없습니다. npm run capture:dump 또는 scripts/capture-dump-dashboard.js 를 먼저 실행하세요.');
    process.exit(1);
  }
  const payload = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('벌크 캡처 대상 지사:', BRANCHES.join(', '), '| 출력:', OUT_DIR, '(날짜/지사/매니저/설계사.png)');

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

  await page.waitForFunction(
    () => typeof window.__CAPTURE_SELECT === 'function' && typeof window.__CAPTURE_GET_PNG === 'function',
    { timeout: 15000 }
  ).catch(() => {
    console.error('캡처 API가 준비되지 않았습니다. /direct?capture=1 과 data/capture/dashboard.json을 확인하세요.');
    process.exit(1);
  });

  let totalSaved = 0;
  for (let b = 0; b < BRANCHES.length; b++) {
    const branchLabel = BRANCHES[b];
    // 두 번째 지사부터는 페이지 재로드로 캡처 API 재주입 (파트너 전환 시 API 사라짐 방지)
    if (b > 0) {
      await page.goto(CAPTURE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForFunction(
        () => typeof window.__CAPTURE_SELECT === 'function' && typeof window.__CAPTURE_GET_PNG === 'function',
        { timeout: 15000 }
      ).catch(() => {});
      await new Promise((r) => setTimeout(r, 500));
    }
    const n = await captureBranch(page, payload, branchLabel, OUT_DIR);
    totalSaved += n;
  }

  await browser.close();
  console.log('캡처 완료. 총 저장:', totalSaved, '| 출력:', OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
