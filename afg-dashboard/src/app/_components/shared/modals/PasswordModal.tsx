'use client';

import React from 'react';

interface PasswordModalProps {
  isOpen: boolean;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  passwordError: string | null;
  passwordLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordError,
  passwordLoading,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-md p-8 border border-gray-200 dark:border-gray-700">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">비밀번호 변경</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
          최초 로그인 시 안전을 위해 비밀번호를 변경해야 합니다.
        </p>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              새로운 비밀번호
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="새 비밀번호 입력"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              새로운 비밀번호 확인
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="새 비밀번호 다시 입력"
            />
          </div>
          
          {passwordError && (
            <p className="text-red-500 text-sm">{passwordError}</p>
          )}

          <button
            type="submit"
            disabled={passwordLoading}
            className="w-full py-3 px-4 bg-primary hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {passwordLoading ? "변경 중..." : "비밀번호 변경하기"}
          </button>
        </form>
      </div>
    </div>
  );
};
