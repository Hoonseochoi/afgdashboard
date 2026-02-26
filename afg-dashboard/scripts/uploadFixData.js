/**
 * Fix(고정) 데이터만 Firestore에 업로드
 * - 설계사 목록 (src/data/data.json)
 * - 매니저/관리자 계정
 * 고정값이므로 데이터나 계정 구조가 바뀔 때만 실행하면 됨.
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('../firebase-admin-key.json');
const data = require('../src/data/data.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function uploadFixData() {
  console.log('[Fix] 고정 데이터 업로드를 시작합니다...');

  let batch = db.batch();
  let count = 0;
  let totalCount = 0;
  const managers = new Map();

  // 1. 설계사 데이터 업로드
  for (const agent of data) {
    const docRef = db.collection('agents').doc(String(agent.code));

    agent.password = String(agent.code);
    agent.isFirstLogin = true;
    agent.role = 'agent';

    if (agent.managerCode && agent.managerCode !== 'UNKNOWN') {
      managers.set(agent.managerCode, agent.managerName);
    }

    batch.set(docRef, agent);
    count++;
    totalCount++;

    if (count === 400) {
      await batch.commit();
      console.log(`  ${totalCount}개 설계사 업로드 완료...`);
      batch = db.batch();
      count = 0;
    }
  }

  // 2. 매니저 계정
  for (const [mCode, mName] of managers.entries()) {
    const docRef = db.collection('agents').doc(String(mCode));
    batch.set(docRef, {
      code: String(mCode),
      name: mName,
      password: String(mCode),
      isFirstLogin: true,
      role: 'manager'
    });
    count++;
    totalCount++;

    if (count === 400) {
      await batch.commit();
      console.log(`  ${totalCount}개 업로드 완료...`);
      batch = db.batch();
      count = 0;
    }
  }

  // 3. 테스트 매니저 (312345678)
  const testManagerRef = db.collection('agents').doc('312345678');
  batch.set(testManagerRef, {
    code: '312345678',
    name: '관리 매니저',
    password: '312345678',
    isFirstLogin: true,
    role: 'manager',
    targetManagerCode: '322006468'
  });
  count++;
  totalCount++;

  // 4. 전체 관리자 (121202739)
  const adminRef = db.collection('agents').doc('121202739');
  batch.set(adminRef, {
    code: '121202739',
    name: '테스트관리자',
    password: '121202739',
    isFirstLogin: true,
    role: 'admin'
  });
  count++;
  totalCount++;

  if (count > 0) {
    await batch.commit();
  }

  console.log(`[Fix] 완료. 총 ${totalCount}개(설계사+매니저+관리자) Firestore에 저장되었습니다.`);
}

if (require.main === module) {
  uploadFixData().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { uploadFixData };
