"use client";

import React from "react";
import { APPLE_CARD_BASE } from "../../constants";
import { formatMan } from "../../utils";

export type ContinuousRun12Props = {
  baseJan: number;
  baseFeb: number;
  basePrize: number;
  extraJan: number;
  extraFeb: number;
  extraPrize: number;
};

export function ContinuousRun12Card({
  baseJan,
  baseFeb,
  basePrize,
  extraJan,
  extraFeb,
  extraPrize,
}: ContinuousRun12Props) {
  const janTarget = 500000; // 50만
  const febTarget = 100000; // 10만

  const janProgress = Math.min(100, (baseJan / janTarget) * 100 || 0);
  const baseProgress = Math.min(100, (baseFeb / febTarget) * 100 || 0);
  const extraProgress = Math.min(100, (extraFeb / febTarget) * 100 || 0);

  const baseStatus =
    baseJan >= 100000 && baseFeb >= 100000 ? "조건 달성" : baseFeb >= 50000 ? "달성 가능성 높음" : "진행 중";

  const extraStatus =
    extraJan >= 100000 && extraFeb >= 100000 ? "조건 달성" : extraFeb >= 50000 ? "달성 가능성 높음" : "진행 중";

  const janTicks = [100000, 200000, 300000, 500000];
  const maxTickReached = janTicks.reduce((acc, t) => (baseJan >= t ? t : acc), 0);

  return (
    <div className={`${APPLE_CARD_BASE} h-full gap-1.5`}>
      <div className="absolute top-0 left-0 right-0 h-px opacity-60 bg-gradient-to-r from-transparent via-violet-300/70 to-transparent dark:via-violet-500/70" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-violet-700 dark:text-violet-200">연속가동 시상</p>
          <h3 className="text-[15.5px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
            1~2월 연속가동 · 추가 연속가동
          </h3>
          <p className="mt-0.5 text-[10px] text-gray-600 dark:text-gray-400 leading-tight">
            1월 16일~31일 · 2월 1일~18일
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex flex-wrap gap-1 justify-end">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-violet-100 dark:bg-violet-800/50 text-violet-800 dark:text-violet-200 border border-violet-300 dark:border-violet-700 shadow-sm">
              13회차
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-violet-100 dark:bg-violet-800/50 text-violet-800 dark:text-violet-200 border border-violet-300 dark:border-violet-700 shadow-sm">
              최대 300%
            </span>
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-[1fr_2fr] gap-0 min-h-[116px]">
        <div className="pointer-events-none absolute inset-y-2 left-[33.33%] border-l border-violet-200/70 dark:border-violet-700/70" />
        <div className="pointer-events-none absolute top-1/2 left-[33.33%] right-3 border-t border-violet-200/70 dark:border-violet-700/70" />

        <div className="pr-3 flex flex-col justify-center">
          <div className="flex items-end gap-2 h-14">
            <div className="flex flex-col justify-between h-full text-[10px] text-gray-500 dark:text-gray-400">
              {janTicks
                .slice()
                .reverse()
                .map((t) => (
                  <span
                    key={t}
                    className={
                      t === maxTickReached && maxTickReached > 0
                        ? "font-semibold text-red-600 dark:text-red-300 drop-shadow-sm"
                        : undefined
                    }
                  >
                    {t / 10000}만
                  </span>
                ))}
            </div>
            <div className="relative flex-1 h-full flex items-end min-h-0">
              <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col justify-between">
                {janTicks.map((t) => (
                  <div key={t} className="h-px w-full bg-violet-100/80 dark:bg-violet-900/60" />
                ))}
              </div>
              <div className="relative w-6 h-full min-h-[60px] mx-auto flex items-end">
                <div className="absolute inset-0 w-full rounded-full bg-white/40 dark:bg-gray-900/40 border border-violet-200/70 dark:border-violet-800/70" />
                <div
                  className="absolute bottom-0 left-0 right-0 mx-auto w-4 rounded-full bg-violet-500 dark:bg-violet-400 shadow-md transition-all"
                  style={{ height: `${janProgress}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
            <span>1월 연속가동 구간</span>
            <span className="font-semibold text-violet-700 dark:text-violet-200">
              {formatMan(baseJan)}만
            </span>
          </div>
        </div>

        <div className="pl-4 flex flex-col justify-between">
          <div className="flex flex-col gap-1.5 pt-0.5 pb-2">
            <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-violet-100 dark:bg-violet-800/60 text-violet-800 dark:text-violet-100">
                  연속가동
                </span>
                <span className="text-[10px] text-gray-600 dark:text-gray-400">2월 1~18일</span>
              </div>
              <span
                className={`font-semibold text-xs ${
                  baseStatus === "조건 달성" ? "text-emerald-600 dark:text-emerald-300" : "text-gray-700 dark:text-gray-200"
                }`}
              >
                {baseStatus}
              </span>
            </div>
            <div className="h-3.5 bg-white/70 dark:bg-gray-900/60 rounded-full overflow-hidden border border-gray-200/80 dark:border-gray-700/70">
              <div
                className="h-full bg-violet-500 dark:bg-violet-400 rounded-full transition-all shadow-sm"
                style={{ width: `${baseProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
              <span>2월 연속가동 구간</span>
              <span className="font-semibold text-violet-700 dark:text-violet-200">
                {formatMan(baseFeb)}만
              </span>
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
              <span>예상 시상금</span>
              <span className="font-bold text-violet-700 dark:text-violet-200 text-sm">
                {formatMan(basePrize)}만원
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-1 pb-0.5 border-t border-violet-100/80 dark:border-violet-800/60">
            <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-violet-100 dark:bg-violet-800/60 text-violet-800 dark:text-violet-100">
                  추가 연속가동
                </span>
                <span className="text-[10px] font-medium text-red-600 dark:text-red-400">2월 1~18일</span>
              </div>
              <span
                className={`font-semibold text-xs ${
                  extraStatus === "조건 달성" ? "text-emerald-600 dark:text-emerald-300" : "text-gray-700 dark:text-gray-200"
                }`}
              >
                {extraStatus}
              </span>
            </div>
            <div className="h-3.5 bg-white/70 dark:bg-gray-900/60 rounded-full overflow-hidden border border-gray-200/80 dark:border-gray-700/70">
              <div
                className="h-full bg-violet-500 dark:bg-violet-400 rounded-full transition-all shadow-sm"
                style={{ width: `${extraProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
              <span>2월 추가 구간</span>
              <span className="font-semibold text-violet-700 dark:text-violet-200">
                {formatMan(extraFeb)}만
              </span>
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
              <span>예상 시상금</span>
              <span className="font-bold text-violet-700 dark:text-violet-200 text-sm">
                {formatMan(extraPrize)}만원
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
