"use client";

import React from "react";
import { PARTNER_TIERS, APPLE_CARD_BASE, type PartnerCardVariant } from "../../constants";
import { formatMan } from "../../utils";

export type PartnerWeekCombinedCardProps = {
  index: number;
  title: string;
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
  className?: string;
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
  className,
}: PartnerWeekCombinedCardProps) {
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
    <div className={`${APPLE_CARD_BASE} ${className ?? ""}`.trim()}>
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
