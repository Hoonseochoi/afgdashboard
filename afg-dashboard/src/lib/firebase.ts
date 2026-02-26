import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyD2kfPQ_SO-UN8BF_LmFC_JUXwuHTjgFs4",
  authDomain: "afgdashboard-3189a.firebaseapp.com",
  projectId: "afgdashboard-3189a",
  storageBucket: "afgdashboard-3189a.firebasestorage.app",
  messagingSenderId: "1052318572309",
  appId: "1:1052318572309:web:304d4dc71e0512eb7a531c",
  measurementId: "G-5LTYNED1J5",
};

// Initialize Firebase (클라이언트에서만 한 번)
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Analytics는 브라우저에서만 동작 (SSR 시 에러 방지)
let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { app, analytics };
export default app;
