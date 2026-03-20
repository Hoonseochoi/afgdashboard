"use client";

import React, { useState } from "react";

interface PushPermissionModalProps {
  onAllow: () => Promise<void>;
  onDeny: () => void;
}

export function PushPermissionModal({ onAllow, onDeny }: PushPermissionModalProps) {
  const [loading, setLoading] = useState(false);

  const handleAllow = async () => {
    setLoading(true);
    try {
      await onAllow();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">
              notifications
            </span>
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">푸시 알림 받기</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">AFG 대시보드</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-5 leading-relaxed">
          새로운 데이터가 업로드되면 알림을 받으시겠습니까?
          <br />
          <span className="text-xs text-gray-400">시상금 업데이트 시 즉시 알려드립니다.</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDeny}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            나중에
          </button>
          <button
            type="button"
            onClick={handleAllow}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {loading ? "처리 중..." : "알림 받기"}
          </button>
        </div>
      </div>
    </div>
  );
}
