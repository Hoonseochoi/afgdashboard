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

    // 만약 여전히 실제 줄바꿈(\n)이 없다면
    if (!privateKey.includes('\n')) {
        // 공백을 전부 제거하고 64자마다 줄바꿈으로 변경하는 매우 원시적이고 확실한 방법
        let rawKey = privateKey.replace(/-----BEGIN PRIVATE KEY-----/g, '');
        rawKey = rawKey.replace(/-----END PRIVATE KEY-----/g, '');
        rawKey = rawKey.replace(/\s+/g, ''); // 모든 공백 제거
        
        const formattedKey = rawKey.match(/.{1,64}/g)?.join('\n') || rawKey;
        privateKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----\n`;
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
