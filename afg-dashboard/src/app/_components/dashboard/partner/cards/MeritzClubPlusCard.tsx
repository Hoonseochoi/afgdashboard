"use client";

import React from "react";
import { APPLE_CARD_BASE } from "../../constants";
import { formatMan } from "../../utils";

const MC_PLUS_TIERS = [200000, 400000, 600000, 800000, 1000000]; // 20/40/60/80/100만

function getAchievedTier(perf: number): number {
  const t = MC_PLUS_TIERS.filter((x) => perf >= x).pop();
  return t ?? 0;
}

export type MeritzClubPlusCardProps = {
  janPerf: number;
  febPerf: number;
  marchPerf: number;
  plusTarget?: number;
  plusProgress?: number;
  currentMonthNum: number;
};

export function MeritzClubPlusCard({
  janPerf,
  febPerf,
  marchPerf,
  currentMonthNum,
}: MeritzClubPlusCardProps) {
  const janTarget = 200000;
  const janTier = getAchievedTier(janPerf);
  const febTier = getAchievedTier(febPerf);
  const marTier = getAchievedTier(marchPerf);
  const febTarget = janTier > 0 ? janTier : 200000;
  const marTarget = Math.min(janTier, febTier) || 200000;

  const isDisqualified = janPerf < 200000 || febPerf < 200000;
  const janDone = janPerf >= janTarget;
  const febDone = febTier > 0 && febPerf >= febTarget;
  const marDone = marTarget > 0 && marchPerf >= marTarget;
  const marchShortfall = marTarget >= 200000 && marchPerf < marTarget ? marTarget - marchPerf : 0;

  const achievedTier = Math.min(janTier, febTier, marTier);
  const prizeAmount = achievedTier * 3;

  const Row = ({
    label,
    perf,
    target,
    done,
    isCurrentMonth,
  }: {
    label: string;
    perf: number;
    target: number;
    done: boolean;
    isCurrentMonth?: boolean;
  }) => (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 bg-white/70 dark:bg-gray-900/40 border ${
        isCurrentMonth
          ? "border-red-500 dark:border-red-400 ring-2 ring-red-400/50 dark:ring-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.25)] dark:shadow-[0_0_12px_rgba(248,113,113,0.2)]"
          : "border-gray-100/80 dark:border-gray-800"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold border ${
            done
              ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-700"
              : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700"
          }`}
        >
          {done ? "✓" : "…"}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-50">{label}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
            {formatMan(perf)}만 / 목표 {formatMan(target)}만
          </p>
        </div>
      </div>
      <span
        className={`text-[10px] font-semibold whitespace-nowrap ${
          done ? "text-emerald-600 dark:text-emerald-300" : isDisqualified ? "text-gray-500 dark:text-gray-400" : "text-red-500 dark:text-red-300"
        }`}
      >
        {done ? "달성" : isDisqualified ? "미대상" : "진행중"}
      </span>
    </div>
  );

  return (
    <div className={`${APPLE_CARD_BASE} h-full`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 flex-shrink-0 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center shadow-md border border-gray-700/80">
            <span className="text-[11px] font-semibold tracking-tight text-meritz-gold">MC+</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 tracking-tight">1분기</p>
            <p className="text-[15.5px] font-bold text-gray-900 dark:text-white truncate mt-0.5 leading-tight">메리츠클럽 플러스</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-900 text-meritz-gold border border-meritz-gold/40 shadow-sm">
            300%
          </span>
          {isDisqualified && (
            <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
              미대상
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2.5 text-[11px] mt-1.5">
        <Row label="1월 실적" perf={janPerf} target={janTarget} done={janDone} isCurrentMonth={currentMonthNum === 1} />
        <Row label="2월 실적" perf={febPerf} target={febTarget} done={febDone} isCurrentMonth={currentMonthNum === 2} />
        <Row label="3월 실적" perf={marchPerf} target={marTarget} done={marDone && currentMonthNum >= 3} isCurrentMonth={currentMonthNum === 3} />
      </div>
      {marchShortfall > 0 && currentMonthNum >= 3 && (
        <p className="mt-2 pt-2 border-t border-gray-100/80 dark:border-gray-700/80 text-[10px] text-red-600 dark:text-red-400 font-medium">
          부족금액 {formatMan(marchShortfall)}만원
        </p>
      )}
      {prizeAmount > 0 && (
        <p className="mt-2 pt-2 border-t border-gray-100/80 dark:border-gray-700/80 text-[11px] font-semibold text-gray-800 dark:text-gray-200">
          시상금 {prizeAmount.toLocaleString()}원
        </p>
      )}
    </div>
  );
}
