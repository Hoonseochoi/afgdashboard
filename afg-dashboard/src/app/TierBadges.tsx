"use client";

import React from "react";

/** 구간 박스 뱃지: 만원 단위 구간 배열, 현재 실적(원). 달성=금색, 다음=레드 */
export function TierBadges({
  tiersMan,
  currentPerf,
  className = "",
}: {
  tiersMan: number[];
  currentPerf: number;
  className?: string;
}) {
  const currentMan = currentPerf / 10000;
  const nextTier = tiersMan.find((t) => t > currentMan);

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {tiersMan.map((t) => {
        const achieved = currentMan >= t;
        const isNext = nextTier === t;
        let style = "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600";
        if (achieved) style = "bg-amber-400/90 dark:bg-amber-500/90 text-amber-950 dark:text-amber-950 border-amber-500 dark:border-amber-400 font-semibold";
        else if (isNext) style = "bg-red-500/90 dark:bg-red-500/90 text-white border-red-600 dark:border-red-400 font-semibold";
        return (
          <span
            key={t}
            className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-md text-xs border ${style}`}
          >
            {t}
          </span>
        );
      })}
    </div>
  );
}
