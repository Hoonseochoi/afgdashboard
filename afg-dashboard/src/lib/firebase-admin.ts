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
    // Vercel 환경변수 콘솔에서 입력 시 다양한 형태로 개행문자가 들어갈 수 있으므로 정규식으로 처리
    privateKey = privateKey.replace(/^"|"$/g, '');
    
    // 환경변수 값이 한 줄로 들어왔을 때 백슬래시 n을 실제 줄바꿈으로 변환
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // 간혹 \r\n으로 들어오는 경우도 대비
    privateKey = privateKey.replace(/\\r\\n/g, '\n');
  }

  // Firebase Admin SDK 초기화 시점에 한 번 더 로깅을 통해 실제 어떤 값들이 누락되었는지 확인 가능하도록 (보안상 첫/마지막 10글자만)
  if (process.env.NODE_ENV !== 'production' || process.env.VERCEL) {
      console.log('Firebase Init Debug:');
      console.log('- Project ID present:', !!projectId);
      console.log('- Client Email present:', !!clientEmail);
      console.log('- Private Key length:', privateKey ? privateKey.length : 0);
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
