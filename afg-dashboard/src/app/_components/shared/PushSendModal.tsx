"use client";

import React, { useState } from "react";

interface PushSendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PushSendModal({ isOpen, onClose }: PushSendModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent?: number; total?: number; error?: string } | null>(null);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), userCode: "develope" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error || "발송 실패" });
      } else {
        setResult({ sent: data.sent, total: data.total });
      }
    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setBody("");
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-xl">campaign</span>
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">푸시 알림 발송</h2>
          </div>
          <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 03.20 데이터 업로드 완료!"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">내용</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="예: 지금 여기를 눌러 시상금을 확인하세요!"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          {result && (
            <div className={`rounded-lg px-3 py-2 text-sm ${result.error ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"}`}>
              {result.error ? `오류: ${result.error}` : `발송 완료 (${result.sent}/${result.total}명)`}
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim()}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {sending ? "발송 중..." : "전체 발송"}
          </button>
        </div>
      </div>
    </div>
  );
}
