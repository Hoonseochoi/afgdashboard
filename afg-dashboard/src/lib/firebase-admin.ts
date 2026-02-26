import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// Vercel: FIREBASE_SERVICE_ACCOUNT_KEY 환경 변수에 JSON 전체를 문자열로 설정
// 로컬: afgdashboard-*-firebase-adminsdk-*.json 파일 사용
if (!admin.apps.length) {
  try {
    let serviceAccount: admin.ServiceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Vercel/Production: 환경 변수 사용
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) as admin.ServiceAccount;
    } else if (process.env.VERCEL) {
      throw new Error('Vercel 배포 시 FIREBASE_SERVICE_ACCOUNT_KEY 환경 변수를 설정해주세요.');
    } else {
      // 로컬: JSON 파일 사용
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      serviceAccount = require('../../afgdashboard-3189a-firebase-adminsdk-fbsvc-4d964fb5b2.json');
    }

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
