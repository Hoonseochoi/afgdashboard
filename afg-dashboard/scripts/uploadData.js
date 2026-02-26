const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const serviceAccount = require('../afgdashboard-3189a-firebase-adminsdk-fbsvc-4d964fb5b2.json');
const data = require('../src/data/data.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function uploadData() {
  console.log('데이터 업로드를 시작합니다...');
  
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
    
    // 매니저 정보 수집
    if (agent.managerCode && agent.managerCode !== 'UNKNOWN') {
      managers.set(agent.managerCode, agent.managerName);
    }

    batch.set(docRef, agent);
    
    count++;
    totalCount++;
    
    if (count === 400) {
      await batch.commit();
      console.log(`${totalCount}개 설계사 데이터 업로드 완료...`);
      batch = db.batch();
      count = 0;
    }
  }

  // 2. 매니저 계정 생성
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
      console.log(`${totalCount}개 데이터 업로드 완료...`);
      batch = db.batch();
      count = 0;
    }
  }

  // 3. 테스트 매니저 계정 생성 (312345678)
  const testManagerRef = db.collection('agents').doc('312345678');
  batch.set(testManagerRef, {
    code: '312345678',
    name: '관리 매니저',
    password: '312345678',
    isFirstLogin: true,
    role: 'manager',
    targetManagerCode: '322006468' // 이 코드를 가진 사람과 동일한 권한(조회)
  });
  count++;
  totalCount++;

  // 4. 전체 관리자 계정 생성 (121202739)
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
  
  // 5. 업데이트 날짜 저장 (daily 폴더 MC_LIST 파일명 앞 4자리, 예: 0226)
  let updateDate = '0000';
  try {
    const dailyDir = path.join(__dirname, '..', '..', 'data', 'daily');
    if (fs.existsSync(dailyDir)) {
      const files = fs.readdirSync(dailyDir);
      const dailyFile = files.find(f => /^\d{4}MC_LIST/i.test(f));
      if (dailyFile) updateDate = dailyFile.substring(0, 4);
    }
  } catch (e) {
    console.warn('업데이트 날짜 추출 실패:', e.message);
  }
  await db.collection('config').doc('app').set({ updateDate }, { merge: true });
  console.log(`업데이트 날짜: ${updateDate}`);
  
  console.log(`업로드 완료! 총 ${totalCount}개의 데이터(설계사+매니저+관리자)가 Firestore에 저장되었습니다.`);
}

uploadData().catch(console.error);
