/**
 * 특정 지사만 대상으로 대시보드 PNG 일괄 캡처 (데일리 안내장용)
 * - 지사명 "엔타스4스튜디오"만 필터링
 * - 3월(2026-03) 실적이 0원이 아닌 사람만 캡처
 * - 저장: [출력폴더]/엔타스4스튜디오/매니저이름/설계사명.png
 *
 * 사전 준비:
 *   1) data/capture/dashboard.json 존재 (scripts/capture-dump-dashboard.js 로 1회 생성)
 *   2) dev 서버 실행 중: npm run dev (port 3001)
 *
 * 사용: node scripts/bulk-capture-branch.js [출력폴더]
 *   출력폴더 기본: data/capture/output
 */
const fs = require('fs');
const path = require('path');

const BRANCH_FILTER = '엔타스4스튜디오';
const MARCH_KEY = '2026-03';
const BASE_URL = process.env.CAPTURE_BASE_URL || 'http://localhost:3001';
const CAPTURE_URL = `${BASE_URL}/direct?capture=1`;

const argOut = process.argv[2];
const OUT_DIR = path.resolve(
  argOut && typeof argOut === 'string' && argOut.length > 0
    ? argOut
    : path.join(__dirname, '..', 'data', 'capture', 'output')
);

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
  const allAgents = (payload.agents || []).filter((a) => a.code !== RANK_EXCLUDE_CODE);

  // 전체 목록에서 지사명 "엔타스4스튜디오" + 3월 실적 0원이 아닌 사람만 + 원본 인덱스 유지 (__CAPTURE_SELECT용)
  const entries = [];
  for (let i = 0; i < allAgents.length; i++) {
    const agent = allAgents[i];
    const branch = agent.branch || '';
    if (!branch.includes(BRANCH_FILTER)) continue;
    const march = (agent.performance && agent.performance[MARCH_KEY]) ?? 0;
    if (march === 0) continue;
    entries.push({ index: i, agent });
  }

  if (entries.length === 0) {
    console.error('엔타스4스튜디오 소속이면서 3월 실적이 0원이 아닌 설계사가 없습니다. dashboard.json을 확인하세요.');
    process.exit(1);
  }

  const branchDir = path.join(OUT_DIR, BRANCH_FILTER);
  if (!fs.existsSync(branchDir)) fs.mkdirSync(branchDir, { recursive: true });
  console.log('대상 지사:', BRANCH_FILTER, '| 3월 실적 > 0만 | 캡처 인원:', entries.length, '| 출력:', branchDir);

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
    console.error('캡처 API가 준비되지 않았습니다. capture=1 페이지와 data/capture/dashboard.json을 확인하세요.');
    process.exit(1);
  });

  for (let k = 0; k < entries.length; k++) {
    const { index, agent } = entries[k];
    const managerName = sanitize(agent.managerName || agent.manager_name || '미지정');
    const name = sanitize(agent.name);
    const dir = path.join(branchDir, managerName);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${name}.png`);

    await page.evaluate((idx) => window.__CAPTURE_SELECT(idx), index);
    // 선택 반영 및 exportArea 리렌더 대기 (직접 페이지에서 상태 업데이트 후 함수 유지)
    await new Promise((r) => setTimeout(r, 800));

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
      console.warn(`[${k + 1}/${entries.length}] ${agent.name} - PNG 생성 실패, 스킵`);
      continue;
    }
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
    console.log(`[${k + 1}/${entries.length}] ${filePath}`);
  }

  await browser.close();
  console.log('캡처 완료. 출력:', branchDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
