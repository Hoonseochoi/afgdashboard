/**
 * 대시보드 데이터 1회 덤프 (캡처용)
 * - 로그인 후 /api/dashboard 결과를 data/capture/dashboard.json 에 저장
 * - 실행 전 dev 서버 실행 필요: npm run dev (port 3001)
 *
 * 사용: node scripts/capture-dump-dashboard.js [사번] [비밀번호]
 *   또는 환경변수: CAPTURE_CODE, CAPTURE_PASSWORD
 *   또는 개발자 계정: node scripts/capture-dump-dashboard.js (develope/develope)
 */
const fs = require('fs');
const path = require('path');

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:3001';
const code = process.argv[2] || process.env.CAPTURE_CODE || 'develope';
const password = process.argv[3] || process.env.CAPTURE_PASSWORD || 'develope';

async function run() {
  let cookie = '';
  const resLogin = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, password }),
  });
  if (!resLogin.ok) {
    const err = await resLogin.json().catch(() => ({}));
    console.error('로그인 실패:', resLogin.status, err);
    process.exit(1);
  }
  const setCookie = resLogin.headers.get('set-cookie');
  if (setCookie) {
    const part = setCookie.split(';')[0];
    if (part) cookie = part.trim();
  }

  const resDash = await fetch(BASE + '/api/dashboard', {
    headers: { Cookie: cookie },
  });
  if (!resDash.ok) {
    console.error('대시보드 조회 실패:', resDash.status, await resDash.text());
    process.exit(1);
  }
  const data = await resDash.json();
  if (data.error) {
    console.error('대시보드 오류:', data.error);
    process.exit(1);
  }

  const outDir = path.join(__dirname, '..', 'data', 'capture');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'dashboard.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('저장 완료:', outPath);
  console.log('agents 수:', (data.agents || []).length);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
