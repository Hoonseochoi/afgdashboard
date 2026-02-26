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
    
    // 만약 Vercel UI에서 띄어쓰기로 여러 줄이 한 줄로 붙여넣어졌을 경우 대비
    if (!privateKey.includes('\n') && privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = privateKey.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
        privateKey = privateKey.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----\n');
        privateKey = privateKey.replace(/ ([a-zA-Z0-9+/=]{64}) /g, '\n$1\n');
        privateKey = privateKey.replace(/ /g, '\n'); // 남은 띄어쓰기를 줄바꿈으로 강제 변환
    }

    // Vercel 환경 변수가 여러 줄의 텍스트를 그대로 가져오면서 공백이 생길 수 있음
    // PEM 포맷은 정확히 "-----BEGIN PRIVATE KEY-----" 와 "-----END PRIVATE KEY-----" 
    // 사이의 base64 텍스트가 줄바꿈과 함께 존재해야 함.
    // 그래서 강제로 전체를 파싱해 다시 올바른 포맷으로 만드는 가장 확실한 방법 사용
    const keyMatch = privateKey.match(/(-----BEGIN PRIVATE KEY-----)([\s\S]*?)(-----END PRIVATE KEY-----)/);
    if (keyMatch && keyMatch[2]) {
      // 1. 헤더와 푸터 사이의 모든 내용에서 공백, 탭, 줄바꿈 제거 (순수 base64 문자열만 남김)
      const base64Body = keyMatch[2].replace(/[\s\r\n]+/g, '');
      // 2. 64글자마다 줄바꿈 추가
      const formattedBody = base64Body.match(/.{1,64}/g)?.join('\n') || base64Body;
      // 3. 올바른 형식으로 재조립
      privateKey = `-----BEGIN PRIVATE KEY-----\n${formattedBody}\n-----END PRIVATE KEY-----\n`;
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
