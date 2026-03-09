const path = require('path');
const fs = require('fs');

// 엑셀 파싱용
const XLSX = require('xlsx');

// 고정: 설계사 코드(D열, 0-based 3), SM(M열, 0-based 12)
const IDX_CODE = 3;
const IDX_SM = 12;
const HEADER_ROW = 0;

function normalizeCode(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const numeric = Number(raw.replace(/[,\s]/g, ''));
  if (!Number.isNaN(numeric) && numeric >= 0 && numeric < 1e15) {
    return String(Math.round(numeric));
  }
  return raw;
}

function escapeSqlString(value) {
  return String(value ?? '').replace(/'/g, "''");
}

function main() {
  const filePath = path.join(
    __dirname,
    '..',
    '..',
    'data',
    'fix',
    '보험사코드(영업자)_20260309-160200.xlsx',
  );

  if (!fs.existsSync(filePath)) {
    console.error('[generate-sm-update-sql] 파일 없음:', filePath);
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // 중복 코드가 있을 수 있으므로 마지막 값으로 덮어쓰는 맵 사용
  const map = new Map();

  for (let r = HEADER_ROW + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    const codeRaw = row[IDX_CODE];
    const smRaw = row[IDX_SM];

    const code = normalizeCode(codeRaw);
    const sm = String(smRaw ?? '').trim();

    if (!code || !sm) continue;

    map.set(code, sm);
  }

  const entries = Array.from(map.entries());
  if (entries.length === 0) {
    console.error('[generate-sm-update-sql] 유효한 매핑이 없습니다.');
    process.exit(1);
  }

  const values = entries.map(
    ([code, sm]) => `('${escapeSqlString(code)}','${escapeSqlString(sm)}')`,
  );

  const sql = `
INSERT INTO public.agent_sm (agent_code, sm)
VALUES
  ${values.join(',\n  ')}
ON CONFLICT (agent_code) DO UPDATE
SET sm = EXCLUDED.sm;
`.trim();

  console.log(sql);
}

main();

