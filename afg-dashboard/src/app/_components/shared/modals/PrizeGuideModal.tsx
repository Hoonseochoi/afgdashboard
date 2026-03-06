'use client';

import React from 'react';

interface PrizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  title?: string;
}

export const PrizeGuideModal: React.FC<PrizeGuideModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  title = "1주차 시상안 보기",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative bg-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900/60 flex items-center justify-center p-3 md:p-4">
          <img
            src={imageSrc}
            alt={title}
            className="max-h-[80vh] w-auto rounded-lg shadow-md"
          />
        </div>
      </div>
    </div>
  );
};
