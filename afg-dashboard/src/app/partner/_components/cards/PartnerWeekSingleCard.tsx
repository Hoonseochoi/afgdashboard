"use client";

import React from "react";
import { PARTNER_TIERS, APPLE_CARD_BASE, type PartnerCardVariant } from "@/app/_components/dashboard/constants";
import { formatMan } from "@/app/_components/dashboard/utils";

export type PartnerWeekSingleCardProps = {
  title: string;
  subtitle?: string;
  badges?: string[];
  lineLabel: string;
  tierPerf: number;
  prize: number;
  variant?: PartnerCardVariant;
  /** true면 10/20/30/50만 구간 뱃지 표시 (4주차 100%) */
  showTierBadges?: boolean;
};

export function PartnerWeekSingleCard({
  title,
  subtitle,
  badges,
  lineLabel,
  tierPerf,
  prize,
  variant = "sky",
  showTierBadges = true,
}: PartnerWeekSingleCardProps) {
  const headerBadgeStyle: Record<PartnerCardVariant, string> = {
    green: "bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-sm",
    sky: "bg-sky-100 dark:bg-sky-800/50 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-700 shadow-sm",
    purple: "bg-violet-100 dark:bg-violet-800/50 text-violet-800 dark:text-violet-200 border border-violet-300 dark:border-violet-700 shadow-sm",
    yellow: "bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-sm",
  };
  const subtitleColor: Record<PartnerCardVariant, string> = {
    green: "text-emerald-700 dark:text-emerald-200",
    sky: "text-sky-700 dark:text-sky-200",
    purple: "text-violet-700 dark:text-violet-200",
    yellow: "text-amber-700 dark:text-amber-200",
  };
  const achieved = PARTNER_TIERS.filter((t) => tierPerf >= t);
  const tierBadgeOn = "bg-primary text-white shadow-sm";
  const tierBadgeOff = "bg-white/80 dark:bg-gray-800/70 text-gray-600 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700";

  return (
    <div className={APPLE_CARD_BASE}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {subtitle && (
            <p className={`text-[11px] font-semibold ${subtitleColor[variant]} tracking-tight`}>{subtitle}</p>
          )}
          <p className={`text-[15.5px] font-bold text-gray-900 dark:text-white tracking-tight break-words min-w-0 ${subtitle ? "mt-0.5" : ""}`}>
            {title}
          </p>
        </div>
        {badges?.length ? (
          <div className="flex flex-shrink-0 flex-wrap gap-1 justify-end">
            {badges.map((b) => (
              <span
                key={b}
                className={`inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-0.5 rounded-md text-[10px] font-semibold border ${headerBadgeStyle[variant]}`}
              >
                {b}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/80 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
          <span>{lineLabel}</span>
          <span className="font-semibold text-gray-900 dark:text-white">{formatMan(tierPerf)}만원</span>
        </div>
        {showTierBadges && (
          <div className="flex flex-wrap gap-1">
            {PARTNER_TIERS.map((t) => (
              <span
                key={t}
                className={`inline-flex items-center justify-center flex-1 min-w-0 px-2 py-0.5 rounded-md text-[10px] font-semibold ${achieved.includes(t) ? tierBadgeOn : tierBadgeOff}`}
              >
                {t / 10000}만
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400 pt-0.5">
          <span>시상금</span>
          <span className="font-bold text-primary">{formatMan(prize)}만원</span>
        </div>
      </div>
    </div>
  );
}
