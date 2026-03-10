/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { GoogleDriveClient } = require('./lib/googleDriveClient');

// .env.local 로부터 환경변수 로드 (GDRIVE_SERVICE_ACCOUNT_KEY 등)
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  require('dotenv').config({ path: envPath });
}

const BASE_URL = process.env.CAPTURE_BASE_URL || 'http://localhost:3001';
const CAPTURE_URL = `${BASE_URL}/direct?capture=1`;
const DRIVE_ROOT_FOLDER_ID =
  process.env.DAILY_SCREENSHOT_FOLDER_ID || '1M8s8vE85v_MUAupxMpKYSSRUG2z0fXlc';

const SORT_MONTH_FALLBACK = '2026-03';

function sanitize(name) {
  if (!name) return '미지정';
  return String(name)
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || '미지정';
}

function getCurrentMonthKey(updateDate) {
  const s = String(updateDate || '').trim();
  if (s.length >= 4) {
    const mm = s.slice(0, 2);
    const year = '2026';
    return `${year}-${mm}`;
  }
  return SORT_MONTH_FALLBACK;
}

function getDateLabelMMDD(updateDate) {
  const s = String(updateDate || '').trim();
  if (!s || s.length < 4) return 'unknown';
  const mm = s.slice(0, 2);
  const dd = s.slice(2, 4);
  return `${mm}.${dd}`;
}

async function loadPayload() {
  const res = await fetch(`${BASE_URL}/api/capture-data`);
  if (!res.ok) {
    throw new Error(`/api/capture-data 호출 실패: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!data.agents || data.agents.length === 0) {
    throw new Error('캡처할 agents 데이터가 없습니다.');
  }
  return data;
}

async function main() {
  let { GDRIVE_SERVICE_ACCOUNT_KEY: serviceAccountJson } = process.env;
  const testMode = process.env.ENTAS4_TEST_MODE === '1';

  if (!serviceAccountJson && fs.existsSync(envPath)) {
    // dotenv가 길이 때문에 무시한 경우를 대비해 직접 파싱
    const rawEnv = fs.readFileSync(envPath, 'utf8');
    const lines = rawEnv.split(/\r?\n/);
    const line = lines.find((l) => l.trim().startsWith('GDRIVE_SERVICE_ACCOUNT_KEY='));
    // eslint-disable-next-line no-console
    console.log(
      '[Entas4 Bulk Capture] fallback parse GDRIVE_SERVICE_ACCOUNT_KEY line found =',
      Boolean(line),
    );
    if (line) {
      serviceAccountJson = line.slice(line.indexOf('=') + 1).trim();
    }
  }

  if (!serviceAccountJson) {
    throw new Error('GDRIVE_SERVICE_ACCOUNT_KEY 환경 변수가 필요합니다.');
  }

  const payload = await loadPayload();
  const monthKey = getCurrentMonthKey(payload.updateDate);
  const baseDateLabelMMDD = getDateLabelMMDD(payload.updateDate);
  const dateLabelMMDD = testMode ? `test-${baseDateLabelMMDD}` : baseDateLabelMMDD;

  const agentsWithIndex = (payload.agents || []).map((agent, index) => ({ agent, index }));
  let filtered = agentsWithIndex
    .filter(({ agent }) => {
      const branch = String(agent.branch || '').trim();
      if (!branch.includes('엔타스4스튜디오')) return false;
      const perf = agent.performance || {};
      const value = perf[monthKey] || 0;
      return value > 0;
    })
    .sort((a, b) => {
      const nameA = String(a.agent.name || '').localeCompare(String(b.agent.name || ''));
      if (nameA !== 0) return nameA;
      return String(a.agent.code || '').localeCompare(String(b.agent.code || ''));
    });

  if (filtered.length === 0) {
    console.log('엔타스4스튜디오 + 실적>0 대상 설계사가 없습니다.');
    return;
  }

  if (testMode && filtered.length > 5) {
    filtered = filtered.slice(0, 5);
  }

  console.log(
    `[Entas4 Bulk Capture] 대상 설계사 수: ${filtered.length}명 | monthKey=${monthKey} | updateDate=${payload.updateDate} | dateLabel=${dateLabelMMDD}`,
  );

  const driveClient = new GoogleDriveClient({
    serviceAccountJson,
    rootFolderId: DRIVE_ROOT_FOLDER_ID,
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });

  try {
    await page.goto(CAPTURE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('페이지 로드 실패. dev 서버가 켜져 있는지 확인하세요:', message);
    await browser.close();
    process.exit(1);
  }

  await page
    .waitForFunction(
      () =>
        typeof window.__CAPTURE_SELECT === 'function' &&
        typeof window.__CAPTURE_GET_PNG === 'function',
      { timeout: 15000 },
    )
    .catch(() => {
      console.error(
        '캡처 API가 준비되지 않았습니다. /direct?capture=1 페이지와 capture 모드 설정을 확인하세요.',
      );
      process.exit(1);
    });

  let successCount = 0;
  for (let i = 0; i < filtered.length; i += 1) {
    const { agent, index } = filtered[i];
    const managerName = sanitize(agent.managerName || agent.manager_name || '미지정');
    const name = sanitize(agent.name || agent.code || 'unknown');

    console.log(`[${i + 1}/${filtered.length}] ${managerName} / ${name} 캡처 시작 (index=${index})`);

    try {
      // eslint-disable-next-line no-loop-func
      await page.evaluate((idx) => {
        if (typeof window.__CAPTURE_SELECT === 'function') {
          window.__CAPTURE_SELECT(idx);
        }
      }, index);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn(
        `[${i + 1}/${filtered.length}] ${name} - __CAPTURE_SELECT 실패, 스킵:`,
        message,
      );
      continue;
    }
    await new Promise((r) => setTimeout(r, 800));

    let dataUrl = null;
    try {
      dataUrl = await page.evaluate(async () => {
        if (typeof window.__CAPTURE_GET_PNG !== 'function') return '';
        return (await window.__CAPTURE_GET_PNG()) || '';
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn(
        `[${i + 1}/${filtered.length}] ${name} - __CAPTURE_GET_PNG 실패, 스킵:`,
        message,
      );
      continue;
    }

    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      console.warn(
        `[${i + 1}/${filtered.length}] ${name} - PNG 데이터가 비어 있거나 형식이 잘못되었습니다, 스킵`,
      );
      continue;
    }

    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    try {
      await driveClient.uploadPng({
        buffer,
        managerName,
        agentName: name,
        dateLabelMMDD,
      });
      successCount += 1;
      console.log(
        `[${i + 1}/${filtered.length}] ${managerName}/${name} 업로드 완료 (누적 ${successCount})`,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn(
        `[${i + 1}/${filtered.length}] ${managerName}/${name} 업로드 실패, 스킵:`,
        message,
      );
    }
  }

  await browser.close();
  console.log(
    `[Entas4 Bulk Capture] 완료. 총 대상 ${filtered.length}명 중 업로드 성공 ${successCount}명`,
  );
}

main().catch((err) => {
  console.error('[Entas4 Bulk Capture] 에러:', err);
  process.exit(1);
});

