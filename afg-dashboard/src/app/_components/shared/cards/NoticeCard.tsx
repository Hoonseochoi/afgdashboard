'use client';

import React from 'react';
import { MovingBorderCard } from '@/components/ui/moving-border';

/** 한 줄 공지사항 카드. 상단 타이틀 바와 프로필 카드 사이에 배치, 프로필 카드와 동일 너비·세로는 프로필의 약 30% 높이 */
interface NoticeCardProps {
  /** 공지 문구 (한 줄 권장). isWooriNotice 시 무시되고 고정 문구 사용 */
  message?: string;
  /** WOORI 브랜치 공지일 때: 레드 무빙보더 + WOORI BRANCH(레드 강조) / 이도경지점장님(네이비 강조) */
  isWooriNotice?: boolean;
  className?: string;
}

const WOORI_RED_GRADIENT =
  'h-20 w-20 opacity-90 bg-[radial-gradient(#dc2626_40%,#b91c1c_50%,transparent_65%)] dark:bg-[radial-gradient(#ef4444_40%,#dc2626_50%,transparent_65%)]';

export function NoticeCard({ message, isWooriNotice = false, className = '' }: NoticeCardProps) {
  const baseContentClass = `
    w-full rounded-xl
    flex items-center px-4 py-2.5
    text-sm
    min-h-[3rem]
    shadow-sm
    ${className}
  `;

  if (isWooriNotice) {
    return (
      <div className="mb-4 md:mb-5 w-full">
        <MovingBorderCard
          duration={3000}
          borderRadius="0.75rem"
          borderClassName={WOORI_RED_GRADIENT}
          innerClassName="relative z-10 w-full min-h-[3rem] overflow-hidden rounded-xl bg-gray-50/95 dark:bg-gray-800/95 border border-red-500/30"
        >
          <div
            role="region"
            aria-label="공지사항"
            className={`${baseContentClass} text-gray-700 dark:text-gray-300 border-0`}
          >
            <span className="inline-flex items-center gap-2 flex-wrap">
              <span className="flex-shrink-0 text-red-600 dark:text-red-400" aria-hidden>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              </span>
              <span>
                GA업계 압도적 1위{' '}
                <span className="font-bold text-red-600 dark:text-red-400">WOORI BRANCH</span>
                {' '}
                <span className="font-bold text-[#001f3f] dark:text-blue-200">이도경지점장님</span>
                의 생일을 축하드립니다 !
              </span>
            </span>
          </div>
        </MovingBorderCard>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="공지사항"
      className={`
        ${baseContentClass}
        border border-gray-200 dark:border-gray-600
        bg-gray-50/80 dark:bg-gray-800/80
        text-gray-700 dark:text-gray-300
        mb-4 md:mb-5
      `}
    >
      <span className="inline-flex items-center gap-2 truncate">
        <span className="flex-shrink-0 text-meritz-gold" aria-hidden>
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        </span>
        <span className="truncate">{message ?? '공지사항이 없습니다.'}</span>
      </span>
    </div>
  );
}
