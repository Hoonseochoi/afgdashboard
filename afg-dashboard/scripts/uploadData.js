/**
 * Fix + Daily 모두 실행 (편의용)
 * - 보통은 분리해서 실행 권장:
 *   - 고정 데이터 변경 시: node scripts/uploadFixData.js
 *   - 매일 날짜만 갱신 시: node scripts/uploadDaily.js
 */
const { uploadFixData } = require('./uploadFixData');
const { uploadDaily } = require('./uploadDaily');

async function runAll() {
  console.log('=== Fix + Daily 전체 업로드 ===\n');
  await uploadFixData();
  console.log('');
  await uploadDaily();
  console.log('\n=== 전체 완료 ===');
}

runAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
