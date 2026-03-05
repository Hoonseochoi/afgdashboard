"use client";

import React from "react";
import { PARTNER_TIERS, APPLE_CARD_BASE } from "../constants";
import { formatMan } from "../utils";

export type PartnerCardVariant = "green" | "sky" | "purple" | "yellow";

export function PartnerPrizeCardFull({
  index,
  title,
  subtitle,
  badges,
  subtext,
  showTierButtons,
  tierPerf,
  tierPerfB,
  expectedPrize,
  variant,
  emphasizePrize,
  prizeBadge,
  isMCPlus,
  mcPlusCurrent,
  mcPlusTarget,
  mcPlusProgress,
  centerPrize,
}: {
  index: number;
  title: string;
  /** 상단 서브타이틀 (2~3월 연속시상처럼 타이틀 위 한 줄) */
  subtitle?: string;
  /** 타이틀 오른쪽 라인 배지: [익월], [13회차], [#%], [최대#%] 등 */
  badges?: string[];
  /** 타이틀 아래 해당 기간 달성 실적 서브텍스트 */
  subtext?: string;
  showTierButtons: boolean;
  tierPerf: number;
  tierPerfB?: number;
  expectedPrize: number;
  variant: PartnerCardVariant;
  /** 1번 시상 등 시상금 강조(큰 글자) */
  emphasizePrize?: boolean;
  /** 시상금 라인 오른쪽 배지 (예: 3월 8일까지 10만 달성시 완성) */
  prizeBadge?: string;
  isMCPlus?: boolean;
  mcPlusCurrent?: number;
  mcPlusTarget?: number;
  mcPlusProgress?: number;
  /** 시상금 영역 가운데 정렬 + 크게 표시 */
  centerPrize?: boolean;
}) {
  const variantAccent = {
    green: "bg-emerald-500 dark:bg-emerald-500 text-white shadow-sm",
    sky: "bg-sky-500 dark:bg-sky-500 text-white shadow-sm",
    purple: "bg-violet-500 dark:bg-violet-500 text-white shadow-sm",
    yellow: "bg-amber-500 dark:bg-amber-500 text-white shadow-sm",
  };
  const badgeStyle = {
    green: "bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-sm",
    sky: "bg-sky-100 dark:bg-sky-800/50 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-700 shadow-sm",
    purple: "bg-violet-100 dark:bg-violet-800/50 text-violet-800 dark:text-violet-200 border border-violet-300 dark:border-violet-700 shadow-sm",
    yellow: "bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-sm",
  };
  const subtitleColor = {
    green: "text-emerald-700 dark:text-emerald-200",
    sky: "text-sky-700 dark:text-sky-200",
    purple: "text-violet-700 dark:text-violet-200",
    yellow: "text-amber-700 dark:text-amber-200",
  };
  const achieved = showTierButtons
    ? PARTNER_TIERS.filter((t) => (tierPerfB != null ? tierPerf >= t && tierPerfB >= t : tierPerf >= t))
    : [];
  const tierAreaHeight = "min-h-[47px] flex items-center";

  return (
    <div className={`${APPLE_CARD_BASE} h-full`}>
      {/* 상단 입체감 하이라이트 */}
      <div
        className={`absolute top-0 left-0 right-0 h-px opacity-60 ${
          variant === "green"
            ? "bg-gradient-to-r from-transparent via-emerald-300 to-transparent dark:via-emerald-600"
            : variant === "sky"
              ? "bg-gradient-to-r from-transparent via-sky-300 to-transparent dark:via-sky-600"
              : variant === "purple"
                ? "bg-gradient-to-r from-transparent via-violet-300 to-transparent dark:via-violet-600"
                : "bg-gradient-to-r from-transparent via-amber-300 to-transparent dark:via-amber-600"
            }`}
        />
      {/* 헤더: 2~3월 연속가동과 동일 구조 — 좌(서브타이틀+타이틀) / 우(배지) */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {subtitle && (
            <p className={`text-[11px] font-semibold ${subtitleColor[variant]} tracking-tight`}>{subtitle}</p>
          )}
          <p className={`text-[15.5px] font-bold text-gray-900 dark:text-white tracking-tight break-words min-w-0 ${subtitle ? "mt-0.5" : ""}`}>
            {title}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap gap-1 justify-end">
          {badges?.map((b) => (
            <span key={b} className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${badgeStyle[variant]}`}>
              {b}
            </span>
          ))}
        </div>
      </div>
      {subtext && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mb-1.5 relative">{subtext}</p>
      )}
      {/* 시상 구간 게이지바 영역 — 높이 통일로 카드 정렬 */}
      <div className={tierAreaHeight}>
        {showTierButtons && (
          <div className="grid grid-cols-4 gap-1.5 w-full">
            {PARTNER_TIERS.map((t) => {
              const isAchieved = achieved.includes(t);
              return (
                <span
                  key={t}
                  className={`flex items-center justify-center px-2 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                    isAchieved
                      ? "bg-primary text-white dark:bg-primary dark:text-gray-900 shadow-md"
                      : "bg-white/80 dark:bg-gray-800/70 text-gray-600 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700"
                  }`}
                >
                  {t / 10000}만
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div
        className={`${
          centerPrize
            ? "flex-1 flex flex-col items-center justify-center gap-1 text-center min-h-[120px]"
            : "mt-auto pt-2.5 border-t border-gray-200/60 dark:border-gray-600/50 flex items-center justify-between gap-2 flex-wrap"
        }`}
      >
        <p
          className={`font-bold text-primary ${
            centerPrize ? "text-3xl sm:text-4xl" : emphasizePrize ? "text-xl sm:text-2xl" : "text-base"
          } drop-shadow-sm`}
        >
          {formatMan(expectedPrize)}만원
        </p>
        {prizeBadge && (
          <span
            className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap ${
              centerPrize ? "mt-0.5 mx-auto" : ""
            } ${badgeStyle[variant]}`}
          >
            {prizeBadge}
          </span>
        )}
      </div>
    </div>
  );
}

type PartnerWeekCombinedCardProps = {
  index: number;
  title: string;
  /** 상단 서브타이틀 (타이틀 위 한 줄) */
  subtitle?: string;
  badges?: string[];
  line1Label: string;
  line2Label: string;
  tierPerf1: number;
  tierPerf2: number;
  prize1: number;
  prize2: number;
  rateLabel1?: string;
  rateLabel2?: string;
  variant?: PartnerCardVariant;
};

export function PartnerWeekCombinedCard({
  index,
  title,
  subtitle,
  badges,
  line1Label,
  line2Label,
  tierPerf1,
  tierPerf2,
  prize1,
  prize2,
  rateLabel1,
  rateLabel2,
  variant = "sky",
}: PartnerWeekCombinedCardProps) {
  const variantAccent = {
    green: "bg-emerald-500 dark:bg-emerald-500 text-white shadow-sm",
    sky: "bg-sky-500 dark:bg-sky-500 text-white shadow-sm",
    purple: "bg-violet-500 dark:bg-violet-500 text-white shadow-sm",
    yellow: "bg-amber-500 dark:bg-amber-500 text-white shadow-sm",
  };

  const headerBadgeStyle = {
    green: "bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-sm",
    sky: "bg-sky-100 dark:bg-sky-800/50 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-700 shadow-sm",
    purple: "bg-violet-100 dark:bg-violet-800/50 text-violet-800 dark:text-violet-200 border border-violet-300 dark:border-violet-700 shadow-sm",
    yellow: "bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-sm",
  };
  const subtitleColor = {
    green: "text-emerald-700 dark:text-emerald-200",
    sky: "text-sky-700 dark:text-sky-200",
    purple: "text-violet-700 dark:text-violet-200",
    yellow: "text-amber-700 dark:text-amber-200",
  };

  const achieved1 = PARTNER_TIERS.filter((t) => tierPerf1 >= t);
  const achieved2 = PARTNER_TIERS.filter((t) => tierPerf2 >= t);

  const tierBadgeBase = "inline-flex items-center justify-center flex-1 min-w-0 px-2 py-0.5 rounded-md text-[10px] font-semibold";
  const tierBadgeOn = "bg-primary text-white shadow-sm";
  const tierBadgeOff =
    "bg-white/80 dark:bg-gray-800/70 text-gray-600 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700";

  return (
    <div className={APPLE_CARD_BASE}>
      {/* 헤더: 2~3월 연속가동과 동일 구조 — 좌(서브타이틀+타이틀) / 우(배지) */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {subtitle && (
            <p className={`text-[11px] font-semibold ${subtitleColor[variant]} tracking-tight`}>{subtitle}</p>
          )}
          <p className={`text-[15.5px] font-bold text-gray-900 dark:text-white tracking-tight break-words min-w-0 ${subtitle ? "mt-0.5" : ""}`}>
            {title}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap gap-1 justify-end">
          {badges?.map((b) => (
            <span
              key={b}
              className={`inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-0.5 rounded-md text-[10px] font-semibold border ${headerBadgeStyle[variant]}`}
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 text-[11px] text-gray-700 dark:text-gray-100 mt-1.5">
        {/* 윗 블록 */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-50">{line1Label}</p>
              {rateLabel1 && (
                <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 break-keep">{rateLabel1}</p>
              )}
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">
              시상금 {formatMan(prize1)}만
            </span>
          </div>
          <div className="mt-0.5 flex gap-1.5">
            {PARTNER_TIERS.map((t) => {
              const on = achieved1.includes(t);
              return (
                <span key={t} className={`${tierBadgeBase} ${on ? tierBadgeOn : tierBadgeOff}`}>
                  {t / 10000}만
                </span>
              );
            })}
          </div>
          <p className="mt-0.5 text-[10px] text-gray-600 dark:text-gray-400">
            실적 {formatMan(tierPerf1)}만
          </p>
        </div>

        {/* 아랫 블록 */}
        <div className="pt-1.5 border-t border-gray-200/70 dark:border-gray-700/70">
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-50">{line2Label}</p>
              {rateLabel2 && (
                <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 break-keep">{rateLabel2}</p>
              )}
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">
              시상금 {formatMan(prize2)}만
            </span>
          </div>
          <div className="mt-0.5 flex gap-1.5">
            {PARTNER_TIERS.map((t) => {
              const on = achieved2.includes(t);
              return (
                <span key={t} className={`${tierBadgeBase} ${on ? tierBadgeOn : tierBadgeOff}`}>
                  {t / 10000}만
                </span>
              );
            })}
          </div>
          <p className="mt-0.5 text-[10px] text-gray-600 dark:text-gray-400">
            실적 {formatMan(tierPerf2)}만
          </p>
        </div>
      </div>
    </div>
  );
}

type MeritzClubPlusCardProps = {
  janPerf: number;
  febPerf: number;
  marchPerf: number;
  plusTarget: number;
  plusProgress: number;
  currentMonthNum: number;
};

export function MeritzClubPlusCard({
  janPerf,
  febPerf,
  marchPerf,
  plusTarget,
  plusProgress,
  currentMonthNum,
}: MeritzClubPlusCardProps) {
  const janTarget = 200000;
  const febTarget = 500000;
  const marTarget = plusTarget || 200000;

  const janDone = janPerf >= janTarget;
  const febDone = febPerf >= febTarget;
  const marDone = marTarget > 0 && marchPerf >= marTarget;

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
            {formatMan(perf)}만 / {formatMan(target)}만
          </p>
        </div>
      </div>
      <span
        className={`text-[10px] font-semibold whitespace-nowrap ${
          done ? "text-emerald-600 dark:text-emerald-300" : "text-red-500 dark:text-red-300"
        }`}
      >
        {done ? "달성" : "진행중"}
      </span>
    </div>
  );

  return (
    <div className={`${APPLE_CARD_BASE} h-full`}>
      {/* 헤더: 2~3월 연속가동과 동일 구조 — 좌(서브타이틀+타이틀) / 우(배지) */}
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
        <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-900 text-meritz-gold border border-meritz-gold/40 shadow-sm">
          Q1
        </span>
      </div>

      {/* 1·2·3월 리스트 (현재 월 행 빨간 테두리 강조) */}
      <div className="space-y-2.5 text-[11px] mt-1.5">
        <Row label="1월 실적" perf={janPerf} target={janTarget} done={janDone} isCurrentMonth={currentMonthNum === 1} />
        <Row label="2월 실적" perf={febPerf} target={febTarget} done={febDone} isCurrentMonth={currentMonthNum === 2} />
        <Row label="3월 실적" perf={marchPerf} target={marTarget} done={marDone && currentMonthNum >= 3} isCurrentMonth={currentMonthNum === 3} />
      </div>
    </div>
  );
}

type PartnerDoubleMeritzCardProps = {
  prevMonthPerf: number;
  currentMonthPerf: number;
  doubleMeritzPrize: number;
};

const DOUBLE_MERITZ_TIERS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]; // 만원 단위

export function PartnerDoubleMeritzCard({
  prevMonthPerf,
  currentMonthPerf,
  doubleMeritzPrize,
}: PartnerDoubleMeritzCardProps) {
  const eligible = prevMonthPerf >= 200000 && currentMonthPerf >= 200000;

  return (
    <div className={`${APPLE_CARD_BASE} h-full border-amber-300/80 dark:border-amber-600/80`}>
      {/* 헤더: Only AFG CLUB / 2배 메리츠 클럽 (서브타이틀 없음) */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-200 tracking-tight">Only AFG CLUB</p>
          <h3 className="text-[15.5px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
            2배 메리츠 클럽
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-400 text-white text-xs font-extrabold shadow-md">
            X2
          </span>
          <span
            className={`text-[10px] font-semibold whitespace-nowrap ${
              eligible ? "text-emerald-600 dark:text-emerald-300" : "text-gray-600 dark:text-gray-300"
            }`}
          >
            {eligible ? "조건 충족" : "도전중"}
          </span>
        </div>
      </div>

      {/* 10~100만 구간 뱃지 2행 (5열) */}
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {DOUBLE_MERITZ_TIERS.map((tierMan) => {
          const tierValue = tierMan * 100000;
          const achieved = eligible && currentMonthPerf >= tierValue;
          return (
            <span
              key={tierMan}
              className={`inline-flex items-center justify-center rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-all ${
                achieved
                  ? "bg-amber-500 text-white dark:bg-amber-400 dark:text-gray-900 shadow-sm"
                  : "bg-white/80 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400 border border-gray-200/80 dark:border-gray-700"
              }`}
            >
              {tierMan}만
            </span>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100/80 dark:border-gray-700/80 flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
        <span>예상 시상금</span>
        <span className="text-base font-bold text-amber-600 dark:text-amber-300">
          {formatMan(doubleMeritzPrize)}만원
        </span>
      </div>
    </div>
  );
}

type ContinuousRun12Props = {
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
        {/* 가운데 세로 라인 */}
        <div className="pointer-events-none absolute inset-y-2 left-[33.33%] border-l border-violet-200/70 dark:border-violet-700/70" />
        {/* 우측만 가로 라인 */}
        <div className="pointer-events-none absolute top-1/2 left-[33.33%] right-3 border-t border-violet-200/70 dark:border-violet-700/70" />

        {/* 좌측: 1월 세로 그래프 (10,20,30,50 눈금) */}
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

        {/* 우측: 위/아래 2월 게이지 (연속·추가 연속) */}
        <div className="pl-4 flex flex-col justify-between">
          {/* 연속가동 */}
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

          {/* 추가 연속가동 */}
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

type ContinuousRun23Props = {
  febPerf: number;
  febExtraPerf: number;
  march15Perf: number;
  march8Perf: number;
  basePrize: number;
  extraPrize: number;
};

export function ContinuousRun23Card({
  febPerf,
  febExtraPerf,
  march15Perf,
  march8Perf,
  basePrize,
  extraPrize,
}: ContinuousRun23Props) {
  const febTarget = 500000; // 50만
  const marchTarget = 100000; // 10만

  const febProgress = Math.min(100, (febPerf / febTarget) * 100 || 0);
  const march15Progress = Math.min(100, (march15Perf / marchTarget) * 100 || 0);
  const march8Progress = Math.min(100, (march8Perf / marchTarget) * 100 || 0);

  const baseStatus = febPerf >= 100000 && march15Perf >= 100000 ? "조건 달성" : "진행 중";
  const extraStatus = febExtraPerf >= 100000 && march8Perf >= 100000 ? "조건 달성" : "진행 중";

  const febTicks = [100000, 200000, 300000, 500000];
  const maxTickReached = febTicks.reduce((acc, t) => (febPerf >= t ? t : acc), 0);

  return (
    <div className={`${APPLE_CARD_BASE} h-full gap-1.5`}>
      <div className="absolute top-0 left-0 right-0 h-px opacity-60 bg-gradient-to-r from-transparent via-violet-300/70 to-transparent dark:via-violet-500/70" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-violet-700 dark:text-violet-200">연속가동 시상</p>
          <h3 className="text-[15.5px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
            2~3월 연속가동 · 추가 연속가동
          </h3>
          <p className="mt-0.5 text-[10px] text-gray-600 dark:text-gray-400 leading-tight">
            2월 16일~28일 · 3월 1일~15일
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
        {/* 가운데 세로 라인 (좌·우 영역 경계) */}
        <div className="pointer-events-none absolute inset-y-2 left-[33.33%] border-l border-violet-200/70 dark:border-violet-700/70" />
        {/* 우측만 가운데 가로 라인 */}
        <div className="pointer-events-none absolute top-1/2 left-[33.33%] right-3 border-t border-violet-200/70 dark:border-violet-700/70" />

        {/* 좌측: 2월 세로 그래프 (10,20,30,50 눈금) */}
        <div className="pr-3 flex flex-col justify-center">
          <div className="flex items-end gap-2 h-14">
            <div className="flex flex-col justify-between h-full text-[10px] text-gray-500 dark:text-gray-400">
              {febTicks
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
                {febTicks.map((t) => (
                  <div key={t} className="h-px w-full bg-violet-100/80 dark:bg-violet-900/60" />
                ))}
              </div>
              <div className="relative w-6 h-full min-h-[60px] mx-auto flex items-end">
                <div className="absolute inset-0 w-full rounded-full bg-white/40 dark:bg-gray-900/40 border border-violet-200/70 dark:border-violet-800/70" />
                <div
                  className="absolute bottom-0 left-0 right-0 mx-auto w-4 rounded-full bg-violet-500 dark:bg-violet-400 shadow-md transition-all"
                  style={{ height: `${febProgress}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
            <span>2월 연속가동 구간</span>
            <span className="font-semibold text-violet-700 dark:text-violet-200">
              {formatMan(febPerf)}만
            </span>
          </div>
        </div>

        {/* 우측: 위/아래 3월 게이지 (3/15, 3/8 마감) */}
        <div className="pl-4 flex flex-col justify-between">
          <div className="flex flex-col gap-1 pt-0.5 pb-1.5">
            <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-violet-100 dark:bg-violet-800/60 text-violet-800 dark:text-violet-100">
                  연속가동
                </span>
                <span className="text-[10px] text-gray-600 dark:text-gray-400">3월 1~15일</span>
              </div>
              <span className={`font-semibold text-xs ${baseStatus === "조건 달성" ? "text-emerald-600 dark:text-emerald-300" : "text-gray-700 dark:text-gray-200"}`}>
                {baseStatus}
              </span>
            </div>
            <div className="h-3.5 bg-white/70 dark:bg-gray-900/60 rounded-full overflow-hidden border border-gray-200/80 dark:border-gray-700/70">
              <div
                className="h-full bg-violet-500 dark:bg-violet-400 rounded-full transition-all shadow-sm"
                style={{ width: `${march15Progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
              <span>현재 3월 실적</span>
              <span className="font-semibold text-violet-700 dark:text-violet-200">
                {formatMan(march15Perf)}만
              </span>
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
              <span>예상 시상금</span>
              <span className="font-bold text-violet-700 dark:text-violet-200 text-sm">
                {formatMan(basePrize)}만원
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 pt-1 pb-0.5">
            <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-violet-100 dark:bg-violet-800/60 text-violet-800 dark:text-violet-100">
                  추가 연속가동
                </span>
                <span className="text-[10px] font-medium text-red-600 dark:text-red-400">3월 1~8일</span>
              </div>
              <span className={`font-semibold text-xs ${extraStatus === "조건 달성" ? "text-emerald-600 dark:text-emerald-300" : "text-gray-700 dark:text-gray-200"}`}>
                {extraStatus}
              </span>
            </div>
            <div className="h-3.5 bg-white/70 dark:bg-gray-900/60 rounded-full overflow-hidden border border-gray-200/80 dark:border-gray-700/70">
              <div
                className="h-full bg-violet-500 dark:bg-violet-400 rounded-full transition-all shadow-sm"
                style={{ width: `${march8Progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
              <span>현재 3월 실적</span>
              <span className="font-semibold text-violet-700 dark:text-violet-200">
                {formatMan(march8Perf)}만
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
