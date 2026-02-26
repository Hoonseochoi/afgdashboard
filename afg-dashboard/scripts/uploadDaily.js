/**
 * Daily(일별) 데이터만 Firestore에 반영
 * - data/daily 폴더의 MC_LIST 파일명 앞 4자리 → config.app.updateDate
 * 매일 새 MC_LIST가 들어올 때만 실행하면 됨. 쓰기 1건만 발생.
 */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const serviceAccount = require('../firebase-admin-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function uploadDaily() {
  console.log('[Daily] 업데이트 날짜 반영을 시작합니다...');

  let updateDate = '0000';
  try {
    const dailyDir = path.join(__dirname, '..', '..', 'data', 'daily');
    if (fs.existsSync(dailyDir)) {
      const files = fs.readdirSync(dailyDir);
      const dailyFile = files.find((f) => /^\d{4}MC_LIST/i.test(f));
      if (dailyFile) {
        updateDate = dailyFile.substring(0, 4);
      }
    }
  } catch (e) {
    console.warn('  업데이트 날짜 추출 실패:', e.message);
  }

  await db.collection('config').doc('app').set({ updateDate }, { merge: true });
  console.log(`[Daily] 완료. config.app.updateDate = ${updateDate}`);
}

if (require.main === module) {
  uploadDaily().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { uploadDaily };
