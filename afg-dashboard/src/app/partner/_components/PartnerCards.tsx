"use client";

import React from "react";
import { Agent } from "@/types";
import {
  PartnerRegularPlusCard,
  PartnerWeekCombinedCard,
  ContinuousRun12Card,
  ContinuousRun23Card,
} from "./cards";
import { DirectDoubleMeritzCard } from "@/app/direct/_components/cards/DirectDoubleMeritzCard";
import { DirectMeritzClubPlusCard } from "@/app/direct/_components/cards/DirectMeritzClubPlusCard";

interface PartnerCardsProps {
  selectedAgent: Agent;
  selectedViewMonth: number;
  incentiveData: any;
}

function getWeekPerf(agent: Agent, week: 1 | 2, selectedMonth: number): number {
  const w = agent.weekly_data?.find((x) => x.week === week)?.performance;
  const fromWeekly = (agent as { weekly?: { week1?: number; week2?: number } }).weekly;
  if (week === 1) {
    return selectedMonth === 3 ? (agent.productWeek1 ?? w ?? fromWeekly?.week1 ?? 0) : (w ?? fromWeekly?.week1 ?? 0);
  }
  return (agent.partner?.productWeek2 as number | undefined) ?? w ?? fromWeekly?.week2 ?? 0;
}

export function PartnerCards({
  selectedAgent,
  selectedViewMonth,
  incentiveData,
}: PartnerCardsProps) {
  const rawPartner = selectedAgent.partner;
  const partner =
    rawPartner != null && typeof rawPartner === 'string'
      ? (() => {
          try {
            return JSON.parse(rawPartner) as Record<string, unknown>;
          } catch {
            return null;
          }
        })()
      : (rawPartner as Record<string, unknown> | null | undefined) ?? null;
  const weekly = (selectedAgent as { weekly?: { week1?: number; week2?: number } }).weekly;
  const week1InsPerf =
    selectedAgent.weekly_data?.find((x) => x.week === 1)?.performance ?? weekly?.week1 ?? 0;
  const week1ProductPerf =
    selectedAgent.productWeek1 ?? selectedAgent.weekly_data?.find((x) => x.week === 1)?.performance ?? weekly?.week1 ?? 0;

  const janPerf = selectedAgent.performance?.["2026-01"] ?? 0;
  const febPerf = selectedAgent.performance?.["2026-02"] ?? 0;
  const marchPerf = selectedAgent.performance?.["2026-03"] ?? 0;
  const prevMonthKey = selectedViewMonth === 1 ? "2025-12" : `2026-${String(selectedViewMonth - 1).padStart(2, "0")}`;
  const prevMonthPerf = selectedAgent.performance?.[prevMonthKey] ?? 0;

  const week1InsPrize = Number(partner?.productWeek1InsPrize ?? 0);
  const week1ProductPrize = Number(partner?.productWeek1Prize ?? 0);

  const baseJan = Number(partner?.continuous12Jan ?? janPerf);
  const baseFeb = Number(partner?.continuous12Feb ?? febPerf);
  const extraJan = Number(partner?.continuous12ExtraJan ?? 0);
  const extraFeb = Number(partner?.continuous12ExtraFeb ?? 0);

  const febRun = Number(partner?.continuous23Feb ?? febPerf);
  const febExtraRun = Number(partner?.continuous23ExtraFeb ?? 0);
  const march15Perf = Number(partner?.continuous23Mar ?? 0) || marchPerf;
  const march8Perf = Number(partner?.continuous23ExtraMar ?? 0) || marchPerf;

  const toPrizeWon = (v: number): number => (v > 0 && v < 10000 ? v * 10000 : v);
  const basePrize = toPrizeWon(Number(partner?.continuous12Prize ?? 0));
  const extraPrize = toPrizeWon(Number(partner?.continuous12ExtraPrize ?? 0));

  const run23Tiers: [number, number][] = [[100000, 200000], [200000, 600000], [300000, 800000], [500000, 1800000]];
  const run23PrizeFromTier = (feb: number, march: number): number => {
    if (march < 100000) return 0;
    const tier = run23Tiers.find(([t]) => feb >= t);
    return tier ? tier[1] : 0;
  };
  const run23BasePrizeRaw = toPrizeWon(Number(partner?.continuous23Prize ?? 0));
  const run23ExtraPrizeRaw = toPrizeWon(Number(partner?.continuous23ExtraPrize ?? 0));
  const run23BasePrize = run23BasePrizeRaw > 0 ? run23BasePrizeRaw : run23PrizeFromTier(febRun, march15Perf);
  const run23ExtraPrize = run23ExtraPrizeRaw > 0 ? run23ExtraPrizeRaw : run23PrizeFromTier(febExtraRun, march8Perf);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <PartnerRegularPlusCard currentPerf={incentiveData.currentPerf} />
      <PartnerWeekCombinedCard
        index={2}
        title="1주차 인보험 - 상품 시상"
        subtitle="1주차 구간시상"
        badges={["구간 100%"]}
        line1Label="1주차 인보험"
        line2Label="1주차 상품 (통합,간편,어린이)"
        tierPerf1={week1InsPerf}
        tierPerf2={week1ProductPerf}
        prize1={week1InsPrize}
        prize2={week1ProductPrize}
        variant="sky"
      />
      <DirectMeritzClubPlusCard
        janPerf={janPerf}
        febPerf={febPerf}
        marchPerf={marchPerf}
        plusTarget={incentiveData.plusTargetMinPerf ?? null}
        plusProgress={incentiveData.plusProgress ?? 0}
        currentMonthNum={selectedViewMonth}
        meritzClubPlusPrize={incentiveData.clubPlusPrize ?? 0}
        monthLabel={selectedViewMonth === 3 ? "3월" : `${selectedViewMonth}월`}
      />
      <DirectDoubleMeritzCard
        prevMonthPerf={prevMonthPerf}
        currentMonthPerf={incentiveData.currentPerf}
        doubleMeritzPrize={incentiveData.doubleMeritzPrize ?? 0}
        monthLabel={selectedViewMonth === 1 ? "1월" : selectedViewMonth === 2 ? "2월" : "3월"}
        prevMonthLabel={selectedViewMonth === 1 ? "전년12월" : selectedViewMonth === 2 ? "1월" : "2월"}
        currentMonthNum={selectedViewMonth}
      />
      <ContinuousRun12Card
        baseJan={baseJan}
        baseFeb={baseFeb}
        basePrize={basePrize}
        extraJan={extraJan}
        extraFeb={extraFeb}
        extraPrize={extraPrize}
      />
      <ContinuousRun23Card
        febPerf={febRun}
        febExtraPerf={febExtraRun}
        march15Perf={march15Perf}
        march8Perf={march8Perf}
        basePrize={run23BasePrize}
        extraPrize={run23ExtraPrize}
      />
    </div>
  );
}
