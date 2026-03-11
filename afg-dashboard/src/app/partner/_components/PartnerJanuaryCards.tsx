"use client";

import React from "react";
import { Agent } from "@/types";
import {
  PartnerRegularPlusCard,
  PartnerWeekCombinedCard,
  PartnerWeekSingleCard,
  ContinuousRun121Card,
  ContinuousRun12Card,
} from "./cards";
import { DirectMeritzClubPlusCard } from "@/app/direct/_components/cards/DirectMeritzClubPlusCard";
import { getPartnerTierPrize, getPartnerTierPrizeWeek2, getPartnerContinuousPrize, getPartnerContinuousPrizeExtra } from "@/lib/engines/incentiveEngine";

export type JanuaryPartnerData = {
  productWeek1Jan?: number;
  productWeek1PrizeJan?: number;
  productWeek2Jan?: number;
  productWeek2PrizeJan?: number;
  productWeek2InsJan?: number;
  productWeek2InsPrizeJan?: number;
  week3PrizeJan?: number;
  week34SumJan?: number;
  week34PrizeJan?: number;
  continuous121Dec?: number;
  continuous121Jan?: number;
  continuous121Prize?: number;
};

interface PartnerJanuaryCardsProps {
  selectedAgent: Agent;
  incentiveData: { currentPerf: number; clubPlusPrize: number; plusTargetMinPerf?: number | null; plusProgress?: number };
  januaryData: JanuaryPartnerData | null;
}

function toPrizeWon(v: number): number {
  return v > 0 && v < 10000 ? v * 10000 : v;
}

export function PartnerJanuaryCards({
  selectedAgent,
  incentiveData,
  januaryData = null,
}: PartnerJanuaryCardsProps) {
  const j = januaryData ?? {};
  const weekly = (selectedAgent as { weekly?: { week1?: number; week2?: number; week3?: number; week4?: number }; _janWeekly?: { week1?: number; week2?: number; week3?: number; week4?: number } }).weekly
    ?? (selectedAgent as { _janWeekly?: { week1?: number; week2?: number; week3?: number; week4?: number } })._janWeekly;
  const week1InsPerf = Number(weekly?.week1 ?? 0);
  const week1ProductPerf = Number(selectedAgent.productWeek1 ?? 0);
  const week2InsPerf = Number(weekly?.week2 ?? 0);
  const week2ProductPerf = Number((selectedAgent as { productWeek2?: number }).productWeek2 ?? 0);
  const week3Perf = Number(weekly?.week3 ?? 0);
  const week4Perf = Number(weekly?.week4 ?? 0);
  const janPerf = selectedAgent.performance?.["2026-01"] ?? 0;
  const decPerf = selectedAgent.performance?.["2025-12"] ?? 0;

  /** 1주차 인보험/상품: 실적 10만 미만이면 0원 (PRIZE_SUM 값 무시) */
  const week1InsPrize = week1InsPerf < 100000 ? getPartnerTierPrize(week1InsPerf) : (toPrizeWon(Number(j.productWeek1PrizeJan ?? 0)) || getPartnerTierPrize(week1InsPerf));
  const week1ProductPrize = week1ProductPerf < 100000 ? getPartnerTierPrize(week1ProductPerf) : (toPrizeWon(Number(j.productWeek1PrizeJan ?? 0)) || getPartnerTierPrize(week1ProductPerf));
  const week2InsPrize = toPrizeWon(Number(j.productWeek2InsPrizeJan ?? 0)) || getPartnerTierPrizeWeek2(week2InsPerf);
  const week2ProductPrize = toPrizeWon(Number(j.productWeek2PrizeJan ?? 0)) || getPartnerTierPrizeWeek2(week2ProductPerf);
  const week3Prize = toPrizeWon(Number(j.week3PrizeJan ?? 0)) || getPartnerTierPrize(week3Perf);
  const week4PerfForCard = Number(j.week34SumJan ?? 0) || week4Perf;
  const week4Prize = toPrizeWon(Number(j.week34PrizeJan ?? 0)) || getPartnerTierPrize(week4PerfForCard);

  const continuous121Dec = Number(j.continuous121Dec ?? decPerf);
  const continuous121Jan = Number(j.continuous121Jan ?? janPerf);
  const continuous121PrizeRaw = toPrizeWon(Number(j.continuous121Prize ?? 0));
  const continuous121Prize = continuous121PrizeRaw > 0 ? continuous121PrizeRaw : getPartnerContinuousPrize(continuous121Jan);
  const continuous121Condition = continuous121Dec >= 100000 && continuous121Jan >= 100000;
  const continuous121PrizeFinal = continuous121Condition ? continuous121Prize : 0;

  const partner = selectedAgent.partner != null && typeof selectedAgent.partner === "object"
    ? selectedAgent.partner as Record<string, unknown>
    : typeof selectedAgent.partner === "string"
      ? (() => { try { return JSON.parse(selectedAgent.partner) as Record<string, unknown>; } catch { return {}; } })()
      : {};
  const baseJan = Number(partner?.continuous12Jan ?? janPerf);
  const baseFeb = Number(partner?.continuous12Feb ?? selectedAgent.performance?.["2026-02"] ?? 0);
  const extraJan = Number(partner?.continuous12ExtraJan ?? partner?.continuous12Jan ?? janPerf);
  const extraFeb = Number(partner?.continuous12ExtraFeb ?? partner?.continuous12Feb ?? baseFeb);
  const basePrizeRaw = toPrizeWon(Number(partner?.continuous12Prize ?? 0));
  const basePrizeComputed = basePrizeRaw > 0 ? basePrizeRaw : getPartnerContinuousPrize(baseJan);
  const extraPrizeRaw = toPrizeWon(Number(partner?.continuous12ExtraPrize ?? 0));
  const extraPrizeComputed = extraPrizeRaw > 0 ? extraPrizeRaw : getPartnerContinuousPrizeExtra(extraJan);
  const baseConditionMet = baseJan >= 100000 && baseFeb >= 100000;
  const extraConditionMet = extraJan >= 100000 && extraFeb >= 100000;
  const basePrize = baseConditionMet ? basePrizeComputed : 0;
  const extraPrize = extraConditionMet ? extraPrizeComputed : 0;

  const janPerfForPlus = janPerf;
  const febPerf = selectedAgent.performance?.["2026-02"] ?? 0;
  const marchPerf = selectedAgent.performance?.["2026-03"] ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 1. 정규 + 파트너 추가 */}
      <PartnerRegularPlusCard currentPerf={incentiveData.currentPerf} />

      {/* 2·3. 1주차 인보험 - 상품 시상 */}
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

      {/* 4·5. 2주차 인보험 - 상품 시상 */}
      <PartnerWeekCombinedCard
        index={3}
        title="2주차 인보험 - 상품 시상"
        subtitle="2주차 구간시상"
        badges={["구간 100%"]}
        line1Label="2주차 인보험"
        line2Label="2주차 상품 (통합,간편,어린이)"
        tierPerf1={week2InsPerf}
        tierPerf2={week2ProductPerf}
        prize1={week2InsPrize}
        prize2={week2ProductPrize}
        variant="sky"
      />

      {/* 6. 12월~1월 연속가동 */}
      <ContinuousRun121Card
        decPerf={continuous121Dec}
        janPerf={continuous121Jan}
        prize={continuous121PrizeFinal}
        isEndedWithNoPrize={continuous121PrizeFinal === 0}
      />

      {/* 7. 3주차 인보험 */}
      <PartnerWeekSingleCard
        title="3주차 인보험"
        subtitle="3주차 구간시상"
        badges={["구간 100%"]}
        lineLabel="3주차 인보험"
        tierPerf={week3Perf}
        prize={week3Prize}
        variant="sky"
        showTierBadges={false}
      />

      {/* 8. 4주차 인보험 */}
      <PartnerWeekSingleCard
        title="4주차 인보험"
        subtitle="4주차 구간시상"
        badges={["구간 100%"]}
        lineLabel="4주차 인보험"
        tierPerf={week4PerfForCard}
        prize={week4Prize}
        variant="sky"
        showTierBadges={true}
      />

      {/* 9·10. 1~2월 연속가동 · 추가 연속가동 */}
      <ContinuousRun12Card
        baseJan={baseJan}
        baseFeb={baseFeb}
        basePrize={basePrize}
        extraJan={extraJan}
        extraFeb={extraFeb}
        extraPrize={extraPrize}
        isEndedWithNoPrize={basePrize === 0 && extraPrize === 0}
      />

      {/* 11. 메리츠클럽 플러스 */}
      <DirectMeritzClubPlusCard
        janPerf={janPerfForPlus}
        febPerf={febPerf}
        marchPerf={marchPerf}
        plusTarget={incentiveData.plusTargetMinPerf ?? null}
        plusProgress={incentiveData.plusProgress ?? 0}
        currentMonthNum={1}
        meritzClubPlusPrize={incentiveData.clubPlusPrize ?? 0}
        monthLabel="1월"
      />
    </div>
  );
}
