"use client";

import React from "react";
import { APPLE_CARD_BASE } from "@/app/_components/dashboard/constants";
import { formatMan } from "@/app/_components/dashboard/utils";

export type ContinuousRun121Props = {
  decPerf: number;
  janPerf: number;
  prize: number;
  /** 달성금 0일 때 카드 투명도 50% */
  isEndedWithNoPrize?: boolean;
};

export function ContinuousRun121Card({
  decPerf,
  janPerf,
  prize,
  isEndedWithNoPrize = false,
}: ContinuousRun121Props) {
  const decTarget = 500000;
  const janTarget = 100000;
  const decProgress = Math.min(100, (decPerf / decTarget) * 100 || 0);
  const janProgress = Math.min(100, (janPerf / janTarget) * 100 || 0);
  const status =
    decPerf >= 100000 && janPerf >= 100000 ? "조건 달성" : janPerf >= 50000 ? "달성 가능성 높음" : "진행 중";
  const ticks = [100000, 200000, 300000, 500000];
  const maxTickReached = ticks.reduce((acc, t) => (decPerf >= t ? t : acc), 0);

  return (
    <div className={`${APPLE_CARD_BASE} h-full gap-1.5 ${isEndedWithNoPrize ? "opacity-50" : ""}`}>
      <div className="absolute top-0 left-0 right-0 h-px opacity-60 bg-gradient-to-r from-transparent via-violet-300/70 to-transparent dark:via-violet-500/70" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-violet-700 dark:text-violet-200">연속가동 시상</p>
          <h3 className="text-[15.5px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
            12월~1월 연속가동
          </h3>
          <p className="mt-0.5 text-[10px] text-gray-600 dark:text-gray-400 leading-tight">
            12월 구간 · 1월 구간
          </p>
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-violet-100 dark:bg-violet-800/50 text-violet-800 dark:text-violet-200 border border-violet-300 dark:border-violet-700 shadow-sm">
            13회차
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-violet-100 dark:bg-violet-800/50 text-violet-800 dark:text-violet-200 border border-violet-300 dark:border-violet-700 shadow-sm">
            최대 300%
          </span>
        </div>
      </div>

      <div className="relative grid grid-cols-[1fr_2fr] gap-0 min-h-[100px]">
        <div className="pointer-events-none absolute inset-y-2 left-[33.33%] border-l border-violet-200/70 dark:border-violet-700/70" />
        <div className="pr-3 flex flex-col justify-center">
          <div className="flex items-end gap-2 h-12">
            <div className="flex flex-col justify-between h-full text-[10px] text-gray-500 dark:text-gray-400">
              {ticks.slice().reverse().map((t) => (
                <span
                  key={t}
                  className={t === maxTickReached && maxTickReached > 0 ? "font-semibold text-red-600 dark:text-red-300" : undefined}
                >
                  {t / 10000}만
                </span>
              ))}
            </div>
            <div className="relative flex-1 h-full flex items-end min-h-0">
              <div className="absolute bottom-0 left-0 right-0 mx-auto w-4 rounded-full bg-violet-500 dark:bg-violet-400 shadow-md transition-all"
                style={{ height: `${decProgress}%` }} />
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
            <span>12월 구간</span>
            <span className="font-semibold text-violet-700 dark:text-violet-200">{formatMan(decPerf)}만</span>
          </div>
        </div>

        <div className="pl-4 flex flex-col justify-center gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
            <span>1월 구간</span>
            <span className={`font-semibold text-xs ${status === "조건 달성" ? "text-emerald-600 dark:text-emerald-300" : "text-gray-700 dark:text-gray-200"}`}>
              {status}
            </span>
          </div>
          <div className="h-3.5 bg-white/70 dark:bg-gray-900/60 rounded-full overflow-hidden border border-gray-200/80 dark:border-gray-700/70">
            <div className="h-full bg-violet-500 dark:bg-violet-400 rounded-full transition-all" style={{ width: `${janProgress}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
            <span>1월 연속가동</span>
            <span className="font-semibold text-violet-700 dark:text-violet-200">{formatMan(janPerf)}만</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
            <span>예상 시상금</span>
            <span className="font-bold text-violet-700 dark:text-violet-200 text-sm">{formatMan(prize)}만원</span>
          </div>
        </div>
      </div>
    </div>
  );
}
