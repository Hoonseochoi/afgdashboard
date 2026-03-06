import React from "react";
import { Agent } from "@/types";
import { formatMan, displayBranch } from "@/app/_components/dashboard/utils";

interface AgentBannerProps {
  selectedAgent: Agent;
  selectedViewMonth: number;
  rankInMonth: number;
  isTop3: boolean;
  isTop30: boolean;
  isRank1: boolean;
  profileImageSrc: string;
  totalEstimatedPrize: number;
  prizeDiff: number;
  currentMonthPerf: number;
  progress: number;
  targetRankDisplay: number | null;
  goalLabel: string;
  monthlyGoal: number;
  remainToShow: number;
  remainLabel: string;
  currentMonthPerfForBanner: number;
}

export function AgentBanner({
  selectedAgent,
  selectedViewMonth,
  rankInMonth,
  isTop3,
  isTop30,
  isRank1,
  profileImageSrc,
  totalEstimatedPrize,
  prizeDiff,
  currentMonthPerf,
  progress,
  targetRankDisplay,
  goalLabel,
  monthlyGoal,
  remainToShow,
  remainLabel,
  currentMonthPerfForBanner,
}: AgentBannerProps) {
  return (
    <div
      className={`rounded-2xl shadow-lg p-4 md:p-6 mb-6 md:mb-8 relative overflow-hidden ${
        selectedViewMonth === 3
          ? isTop3
            ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-meritz-gold/40 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
            : isTop30
              ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
              : "bg-gradient-to-br from-white to-gray-50/60 dark:from-gray-800 dark:to-gray-800/90 border border-gray-200 dark:border-gray-600 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
          : isTop3
            ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-black dark:via-gray-900 dark:to-black border-2 border-meritz-gold/50"
            : isTop30
              ? "bg-gradient-to-br from-gray-800/95 to-gray-900/95 dark:from-gray-900 dark:to-black border border-meritz-gold/30 bg-surface-light dark:bg-surface-dark"
              : "bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-700"
      }`}
    >
      {selectedViewMonth === 3 ? (
        isTop30 ? (
          <>
            <div className="absolute top-0 right-0 w-72 h-72 bg-gray-100/80 dark:bg-gray-700/30 rounded-full -mr-24 -mt-24 z-0" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-gray-100/60 dark:bg-gray-700/20 rounded-full -ml-20 -mb-20 z-0" />
          </>
        ) : (
          <>
            <div className="absolute top-0 right-0 w-64 h-64 bg-gray-100/70 dark:bg-gray-700/25 rounded-full -mr-16 -mt-16 z-0" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gray-100/50 dark:bg-gray-700/20 rounded-full -ml-12 -mb-12 z-0" />
          </>
        )
      ) : isTop30 ? (
        <>
          <div className="absolute top-0 right-0 w-72 h-72 bg-meritz-gold/10 rounded-full -mr-24 -mt-24 z-0" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-primary/10 rounded-full -ml-20 -mb-20 z-0" />
        </>
      ) : (
        <>
          <div className="absolute top-0 right-0 w-64 h-64 bg-meritz-gold/10 rounded-full -mr-16 -mt-16 z-0" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full -ml-12 -mb-12 z-0" />
        </>
      )}
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="relative">
            <div
              className={`w-24 h-24 rounded-full border-4 shadow-lg flex items-center justify-center overflow-hidden bg-gray-200 dark:bg-gray-700 ${
                isTop3
                  ? "border-meritz-gold"
                  : isTop30
                    ? "border-meritz-gold/80"
                    : "border-meritz-gold"
              }`}
            >
              <img src={profileImageSrc} alt="" className="w-[77%] h-[77%] object-contain" />
            </div>
            {isTop3 ? (
              <div className="absolute -top-4 -right-1 bg-gradient-to-br from-meritz-gold to-amber-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-amber-200/50 flex items-center gap-0.5 scale-[0.8] origin-top-right whitespace-nowrap">
                <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0 fill-current" aria-hidden><path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z"/></svg>
                TOP {rankInMonth}
              </div>
            ) : isTop30 ? (
              <div className="absolute -bottom-4 -right-2 bg-meritz-gold text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow border-2 border-white dark:border-surface-dark flex items-center scale-[0.8] origin-bottom-right whitespace-nowrap">
                <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0 mr-0.5 fill-current" aria-hidden><path d="M17 11V3H7v8H3v12h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8v-2h2v2h-2zm0-4V9h2v2h-2zm0-4V5h2v2h-2zm4 12v-2h2v2h-2zm0-4v-2h2v2h-2z"/></svg>
                TOP {rankInMonth}
              </div>
            ) : (
              <div className="absolute -bottom-2 -right-2 bg-meritz-gold text-white text-xs font-bold px-3 py-1 rounded-full shadow border-2 border-white dark:border-surface-dark flex items-center whitespace-nowrap">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0 mr-1 fill-current" aria-hidden><path d="M17 11V3H7v8H3v12h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8v-2h2v2h-2zm0-4V9h2v2h-2zm0-4V5h2v2h-2zm4 12v-2h2v2h-2zm0-4v-2h2v2h-2z"/></svg>
                VIP
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2
                className={`text-2xl md:text-3xl font-bold ${
                  selectedViewMonth === 3 ? "text-gray-900 dark:text-white" : isTop3 || isTop30 ? "text-white" : "text-gray-900 dark:text-white"
                }`}
              >
                {selectedAgent.name}{" "}
                <span className={`text-base md:text-lg font-normal ${
                  selectedViewMonth === 3 ? "text-gray-500 dark:text-gray-400" : isTop3 ? "text-meritz-gold/90" : isTop30 ? "text-meritz-gold dark:text-meritz-gold/90" : "text-gray-500 dark:text-gray-400"
                }`}>
                  님
                </span>
              </h2>
              {isTop30 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap ${isTop3 ? "bg-meritz-gold/20 text-meritz-gold border border-meritz-gold/40" : "bg-primary/10 text-primary border border-primary/30"}`}>
                  당월실적 {rankInMonth}위
                </span>
              )}
            </div>
            <p className={`mb-2 ${
              selectedViewMonth === 3 ? "text-gray-600 dark:text-gray-300" : isTop3 ? "text-gray-400" : isTop30 ? "text-gray-500 dark:text-gray-400" : "text-gray-600 dark:text-gray-300"
            }`}>
              {displayBranch(selectedAgent as any)}
              {selectedAgent.managerName && (
                <>
                  <span className="mx-1 opacity-70" aria-hidden>·</span>
                  <span>{selectedAgent.managerName} 매니저</span>
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {totalEstimatedPrize > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-meritz-gold/10 text-meritz-gold border border-meritz-gold/30 whitespace-nowrap">
                  {selectedViewMonth}월 시상 달성
                </span>
              )}
            </div>
            {remainToShow > 0 && (
              <div className="mt-3 inline-flex items-center px-3 py-1.5 rounded-md bg-primary/10 border border-primary/30 animate-sway whitespace-nowrap">
                <span className="text-sm font-bold text-primary">
                  {remainLabel === "gap"
                    ? `2위와의 격차 ${formatMan(remainToShow)}만원`
                    : (() => {
                        const current = currentMonthPerfForBanner;
                        const displayTarget = Math.ceil((current + remainToShow) / 100000) * 100000;
                        const displayRemain = Math.max(0, displayTarget - current);
                        return `${formatMan(displayRemain)}만원 더 채우세요 !`;
                      })()}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-row flex-wrap gap-2 sm:gap-4 w-full md:w-auto mt-4 md:mt-0 items-stretch md:items-end">
          <div
            className={`rounded-xl p-2.5 sm:p-4 md:p-5 text-white shadow-lg min-w-0 flex-1 md:min-w-[200px] ${
              isTop3 ? "bg-gradient-to-br from-primary via-red-600 to-red-700 border border-meritz-gold/30" : isTop30 ? "bg-gradient-to-br from-primary to-red-600 border border-meritz-gold/20" : "bg-gradient-to-br from-primary to-red-600"
            }`}
          >
            <p className="text-xs sm:text-sm opacity-90 mb-0.5 sm:mb-1">이번달 총 예상 시상금</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold">
                {formatMan(totalEstimatedPrize)}
                <span className="text-lg font-medium">만원</span>
              </h3>
            </div>
            {selectedViewMonth === 2 && (
              <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs bg-white/20 inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap">
                전월 대비{" "}
                <span className="font-bold">
                  {prizeDiff > 0 ? "+" : ""}
                  {formatMan(prizeDiff)}만원
                </span>{" "}
                {prizeDiff >= 0 ? "▲" : "▼"}
              </div>
            )}
          </div>
          <div
            className={`rounded-xl px-2 md:px-3.5 py-1.5 md:py-2.5 shadow-sm min-w-0 flex-[0.54] md:min-w-[140px] border shrink-0 ${
              isTop3 ? "bg-gray-800/80 dark:bg-gray-800 border-meritz-gold/30" : isTop30 ? "bg-surface-light dark:bg-gray-800 border-meritz-gold/20" : "bg-surface-light dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            }`}
          >
            <p className={`text-[10px] sm:text-xs mb-0.5 ${isTop3 ? "text-gray-400" : "text-gray-500 dark:text-gray-400"}`}>
              현재 인보험 누적 실적
            </p>
            <div className="flex items-baseline gap-1">
              <h3 className={`text-base sm:text-xl md:text-2xl font-bold ${isTop3 ? "text-white" : "text-gray-900 dark:text-white"}`}>
                {formatMan(currentMonthPerf)}
                <span className={isTop3 ? "text-sm sm:text-base font-medium text-meritz-gold/90" : "text-sm sm:text-base font-medium text-gray-500"}>
                  만원
                </span>
              </h3>
            </div>
            <div className={`w-full rounded-full h-1 mt-1.5 ${isTop3 ? "bg-gray-700" : "bg-gray-200 dark:bg-gray-700"}`}>
              <div
                className={isTop3 ? "bg-gradient-to-r from-meritz-gold to-primary h-1 rounded-full" : "bg-primary h-1 rounded-full"}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] sm:text-[11px] text-right mt-0.5 text-gray-400 whitespace-normal break-keep">
              {isRank1 ? (
                "전국 TOP 실적 달성!"
              ) : (
                `${targetRankDisplay != null ? `RANK ${targetRankDisplay}위` : goalLabel}까지 ${formatMan(Math.max(0, monthlyGoal - currentMonthPerf))}만원 남았어요`
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
