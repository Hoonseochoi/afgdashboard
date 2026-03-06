"use client";

import React from "react";
import { APPLE_CARD_BASE } from "@/app/_components/dashboard/constants";
import { formatMan } from "@/app/_components/dashboard/utils";
import { snapDownToMeritzTier, calculateMeritzClubPlusPrize } from "@/lib/engines/incentiveEngine";

const MC_PLUS_TIERS_ASC = [200000, 400000, 600000, 800000, 1000000];
import { motion } from "framer-motion";

export type DirectMeritzClubPlusCardProps = {
  janPerf: number;
  febPerf: number;
  marchPerf: number;
  plusTarget: number | null;
  plusProgress: number;
  currentMonthNum: number;
  meritzClubPlusPrize: number;
  monthLabel?: string;
};

export function DirectMeritzClubPlusCard({
  janPerf,
  febPerf,
  marchPerf,
  plusTarget,
  plusProgress,
  currentMonthNum,
  meritzClubPlusPrize,
  monthLabel = "3월",
}: DirectMeritzClubPlusCardProps) {
  const quarterTarget = plusTarget ?? 0;
  const hasTarget = quarterTarget > 0;
  const isDisqualified = !hasTarget;
  const janTarget = 200000;
  const febTarget = snapDownToMeritzTier(janPerf);
  const marTarget = quarterTarget;

  /** 미대상 시 표시할 다음 분기 월 (예: 1분기 → "4월, 5월, 6월") */
  const nextQuarterMonthLabels = (() => {
    const start = ((Math.floor((currentMonthNum - 1) / 3) + 1) * 3) % 12 + 1;
    const m2 = start >= 12 ? 1 : start + 1;
    const m3 = start >= 11 ? (start === 11 ? 12 : 1) : start + 2;
    return `${start}월, ${m2}월, ${m3}월`;
  })();

  const Row = ({
    label,
    perf,
    target: rowTarget,
    isCurrent,
  }: {
    label: string;
    perf: number;
    target?: number;
    isCurrent?: boolean;
  }) => {
    const isDone = rowTarget ? perf >= rowTarget : false;
    return (
      <div
        className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 bg-white/40 dark:bg-gray-900/40 border transition-all ${
          isCurrent
            ? "border-amber-500/50 ring-1 ring-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.1)]"
            : "border-gray-100 dark:border-gray-800"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold border ${
              isDone
                ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700"
            }`}
          >
            {isDone ? "✓" : "•"}
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold text-gray-800 dark:text-gray-100">{label}</p>
            <p className="text-[9.5px] text-gray-500 dark:text-gray-400 truncate">
              {formatMan(perf)}만 {rowTarget ? `/ 목표 ${formatMan(rowTarget)}만` : ""}
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold ${
            isDone ? "text-emerald-600 dark:text-emerald-400" : isCurrent ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {isDone ? "달성" : isCurrent ? "도전중" : "완료"}
        </span>
      </div>
    );
  };

  return (
    <div className={`${APPLE_CARD_BASE} h-full ${isDisqualified ? "border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-white/5" : "border-amber-300/60 dark:border-amber-600/60 bg-gradient-to-br from-white/90 via-white/50 to-amber-50/40 dark:from-white/10 dark:via-white/5 dark:to-amber-900/10"} text-gray-900 dark:text-white overflow-hidden`}>
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <svg viewBox="0 0 24 24" className="w-16 h-16 fill-current text-amber-600" aria-hidden><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg>
      </div>

      <div className="flex items-start justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md border border-white/20">
            <span className="text-[10px] font-extrabold tracking-tight text-white">MC+</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-amber-700/80 dark:text-meritz-gold/80 tracking-tight uppercase">1분기 퀀텀점프</p>
            <h3 className="text-[14px] font-bold text-gray-900 dark:text-white truncate leading-tight tracking-tight">메리츠 클럽 플러스</h3>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {!isDisqualified && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20 shadow-sm dark:bg-meritz-gold/20 dark:text-meritz-gold dark:border-meritz-gold/40">
              300% 시상
            </span>
          )}
          {isDisqualified && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40">
              미대상
            </span>
          )}
        </div>
      </div>

      {isDisqualified ? (
        <div className="flex flex-col flex-1 min-h-0 relative z-10 pt-2">
          <div className="flex-1 flex items-center justify-center py-2 min-h-[60px]">
            <img
              src="/etc.png"
              alt=""
              className="max-w-full max-h-[80px] w-auto h-auto object-contain"
            />
          </div>
          <p className="text-[13px] font-medium text-gray-600 dark:text-gray-400 text-center pt-1">
            {nextQuarterMonthLabels} 메리츠클럽플러스에 도전하세요!
          </p>
        </div>
      ) : (
        <>
          <div className="mt-2 space-y-1 relative z-10">
            <Row label="1월 실적" perf={janPerf} target={janTarget} isCurrent={currentMonthNum === 1} />
            <Row label="2월 실적" perf={febPerf} target={febTarget} isCurrent={currentMonthNum === 2} />
            <Row label="3월 달성 목표" perf={marchPerf} target={marTarget} isCurrent={currentMonthNum === 3} />
          </div>

          <div className="mt-auto pt-2 relative z-10 space-y-1.5">
            {currentMonthNum >= 3 ? (
              <>
                <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">확보 시상금</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white drop-shadow-sm">
                    {formatMan(meritzClubPlusPrize)}만원
                  </p>
                </div>
                {(() => {
                  const maxAchievableTier = quarterTarget;
                  if (maxAchievableTier === 0) return null;
                  const minPerf = Math.min(janPerf, febPerf, marchPerf);
                  const securedTier = snapDownToMeritzTier(minPerf);
                  if (securedTier >= maxAchievableTier) {
                    return (
<p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                        1분기 메리츠클럽+ 달성
                      </p>
                );
              }
              const nextTier = MC_PLUS_TIERS_ASC.find((t) => t > securedTier && t <= maxAchievableTier);
              if (!nextTier) {
                return (
                  <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                    1분기 메리츠클럽+ 달성
                  </p>
                    );
                  }
                  const gap = nextTier - minPerf;
                  const nextPrize = calculateMeritzClubPlusPrize(nextTier);
                  return (
                    <p className="text-[13px] text-amber-600 dark:text-amber-400 font-medium">
                      {formatMan(gap)}만원 더하면 {formatMan(nextPrize)}만원
                    </p>
                  );
                })()}
              </>
            ) : (
              <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">현재 구간 3월까지 유지 시 예상</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white drop-shadow-sm">
                  {formatMan(meritzClubPlusPrize)}만원
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
