"use client";

import React from "react";
import { PARTNER_TIERS, APPLE_CARD_BASE, type PartnerCardVariant } from "@/app/_components/dashboard/constants";
import { formatMan } from "@/app/_components/dashboard/utils";

export type { PartnerCardVariant };

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
  centerPrize,
}: {
  index: number;
  title: string;
  subtitle?: string;
  badges?: string[];
  subtext?: string;
  showTierButtons: boolean;
  tierPerf: number;
  tierPerfB?: number;
  expectedPrize: number;
  variant: PartnerCardVariant;
  emphasizePrize?: boolean;
  prizeBadge?: string;
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
