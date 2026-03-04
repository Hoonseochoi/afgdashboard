"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (reg.installing) console.log("[PWA] Service Worker 설치 중");
        else if (reg.waiting) console.log("[PWA] Service Worker 대기 중");
        else if (reg.active) console.log("[PWA] Service Worker 활성화됨");
      })
      .catch((err) => console.warn("[PWA] Service Worker 등록 실패:", err));
  }, []);
  return null;
}
