import puppeteer from 'puppeteer';
import { GoogleDriveClient } from './lib/googleDriveClient';

type CaptureAgent = {
  code?: string;
  name?: string;
  branch?: string | null;
  managerName?: string | null;
  manager_name?: string | null;
  performance?: Record<string, number> | null;
};

type CapturePayload = {
  agents: CaptureAgent[];
  updateDate?: string;
};

declare global {
  interface Window {
    __CAPTURE_SELECT?: (index: number) => void;
    __CAPTURE_GET_PNG?: () => Promise<string>;
  }
}

const BASE_URL = process.env.CAPTURE_BASE_URL || 'http://localhost:3001';
const CAPTURE_URL = `${BASE_URL}/direct?capture=1`;
const DRIVE_ROOT_FOLDER_ID =
  process.env.DAILY_SCREENSHOT_FOLDER_ID || '1M8s8vE85v_MUAupxMpKYSSRUG2z0fXlc';

const SORT_MONTH_FALLBACK = '2026-03';

function sanitize(name: string | null | undefined): string {
  if (!name) return '미지정';
  return String(name)
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || '미지정';
}

function getCurrentMonthKey(updateDate: string | undefined): string {
  const s = String(updateDate ?? '').trim();
  if (s.length >= 4) {
    const mm = s.slice(0, 2);
    const year = '2026';
    return `${year}-${mm}`;
  }
  return SORT_MONTH_FALLBACK;
}

// 오늘 날짜(한국시간 기준) MM.DD 라벨
function getTodayLabelMMDD(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  return `${mm}.${dd}`;
}

async function loadPayload(): Promise<CapturePayload> {
  const res = await fetch(`${BASE_URL}/api/capture-data`);
  if (!res.ok) {
    throw new Error(`/api/capture-data 호출 실패: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as CapturePayload;
  if (!data.agents || data.agents.length === 0) {
    throw new Error('캡처할 agents 데이터가 없습니다.');
  }
  return data;
}

async function main() {
  const serviceAccountJson = process.env.GDRIVE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    throw new Error('GDRIVE_SERVICE_ACCOUNT_KEY 환경 변수가 필요합니다.');
  }

  const payload = await loadPayload();
  const monthKey = getCurrentMonthKey(payload.updateDate);
  const dateLabelMMDD = getTodayLabelMMDD();

  const agentsWithIndex = payload.agents.map((agent, index) => ({ agent, index }));
  const filtered = agentsWithIndex
    .filter(({ agent }) => {
      const branch = String(agent.branch || '').trim();
      if (!branch.includes('엔타스4스튜디오')) return false;
      const perf = agent.performance || {};
      const value = perf[monthKey] ?? 0;
      return (value || 0) > 0;
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
      await page.evaluate((idx: number) => {
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

    let dataUrl: string | null = null;
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

