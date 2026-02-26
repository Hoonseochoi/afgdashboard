import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// Vercel: FIREBASE_SERVICE_ACCOUNT_KEY (JSON 한 줄) 또는 개별 변수 사용
// 로컬: .env.local에 동일하게 설정
function getServiceAccount(): admin.ServiceAccount {
  // 방식 1: JSON 전체 (한 줄, 줄바꿈 없이)
  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (keyJson) {
    try {
      return JSON.parse(keyJson) as admin.ServiceAccount;
    } catch {
      // JSON 파싱 실패 시 개별 변수 시도
    }
  }

  // 방식 2: 개별 환경 변수 (Vercel에서 더 안정적)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel 환경 변수에서 가져온 문자열의 이스케이프된 개행문자를 실제 개행문자로 변환
  // 또한 앞뒤 따옴표가 있다면 제거
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    // 따옴표 제거
    privateKey = privateKey.replace(/^"|"$/g, '');
    
    // 이스케이프된 백슬래시(\n)를 실제 줄바꿈으로 변환
    privateKey = privateKey.replace(/\\n/g, '\n');
    privateKey = privateKey.replace(/\\r\\n/g, '\n');

    // 만약 여전히 실제 줄바꿈(\n)이 포함되어 있지 않다면 강제로 복원 시도
    if (!privateKey.includes('\n')) {
        // BEGIN과 END 태그 사이에 있는 문자열 추출
        const keyMatch = privateKey.match(/-----BEGIN PRIVATE KEY-----(.*?)-----END PRIVATE KEY-----/);
        if (keyMatch && keyMatch[1]) {
            // 안의 띄어쓰기/공백 전부 제거
            const body = keyMatch[1].replace(/\s+/g, '');
            // 64글자 단위로 줄바꿈 추가
            const formattedBody = body.match(/.{1,64}/g)?.join('\n') || body;
            privateKey = `-----BEGIN PRIVATE KEY-----\n${formattedBody}\n-----END PRIVATE KEY-----\n`;
        } else {
            // 정규식이 안먹히면, 띄어쓰기를 줄바꿈으로 변경하는 꼼수 (간혹 환경변수에 띄어쓰기로 들어오는 경우)
            privateKey = privateKey.replace(/-----BEGIN PRIVATE KEY-----/g, '-----BEGIN PRIVATE KEY-----\n');
            privateKey = privateKey.replace(/-----END PRIVATE KEY-----/g, '\n-----END PRIVATE KEY-----\n');
            privateKey = privateKey.replace(/ ([a-zA-Z0-9+/=]{64}) /g, '\n$1\n');
        }
    }
  }

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  if (process.env.VERCEL) {
    throw new Error(
      'Vercel: FIREBASE_SERVICE_ACCOUNT_KEY 또는 FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY 설정 필요'
    );
  }

  // 로컬: JSON 파일 사용 (require 대신 fs로 런타임 로드 - 번들러 해석 방지)
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(process.cwd(), 'firebase-admin-key.json');
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as admin.ServiceAccount;
}

if (!admin.apps.length) {
  try {
    const serviceAccount = getServiceAccount();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
    throw error;
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;
