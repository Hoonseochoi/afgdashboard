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
import { getPartnerTierPrize, getPartnerTierPrizeWeek2, getPartnerContinuousPrize, getPartnerContinuousPrizeExtra } from "@/lib/engines/incentiveEngine";
import { PartnerJanuaryCards } from "./PartnerJanuaryCards";
import type { JanuaryPartnerData } from "./PartnerJanuaryCards";

interface PartnerCardsProps {
  selectedAgent: Agent;
  selectedViewMonth: number;
  incentiveData: any;
  /** 1월 파트너 시상 고정 데이터 (API 조회). 1월 선택 시에만 사용 */
  januaryPartnerPrize?: Record<string, unknown> | null;
}

/** 1주차 전체 실적 = weekly_data / weekly.week1. productWeek1(상품별)은 사용하지 않음. */
function getWeekPerf(agent: Agent, week: 1 | 2, _selectedMonth: number): number {
  const w = agent.weekly_data?.find((x) => x.week === week)?.performance;
  const fromWeekly = (agent as { weekly?: { week1?: number; week2?: number } }).weekly;
  if (week === 1) return w ?? fromWeekly?.week1 ?? 0;
  return (agent.partner?.productWeek2 as number | undefined) ?? w ?? fromWeekly?.week2 ?? 0;
}

export function PartnerCards({
  selectedAgent,
  selectedViewMonth,
  incentiveData,
  januaryPartnerPrize = null,
}: PartnerCardsProps) {
  if (selectedViewMonth === 1) {
    return (
      <PartnerJanuaryCards
        selectedAgent={selectedAgent}
        incentiveData={incentiveData}
        januaryData={januaryPartnerPrize as JanuaryPartnerData | null}
      />
    );
  }

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
  /** 1주차 인보험 실적: Supabase weekly.week1 */
  const week1InsPerf = Number(weekly?.week1 ?? 0);
  /** 1주차 상품 실적: Supabase product_week1 (productWeek1) */
  const week1ProductPerf = Number(selectedAgent.productWeek1 ?? 0);

  const janPerf = selectedAgent.performance?.["2026-01"] ?? 0;
  const febPerf = selectedAgent.performance?.["2026-02"] ?? 0;
  const marchPerf = selectedAgent.performance?.["2026-03"] ?? 0;
  const prevMonthKey = selectedViewMonth === 1 ? "2025-12" : `2026-${String(selectedViewMonth - 1).padStart(2, "0")}`;
  const prevMonthPerf = selectedAgent.performance?.[prevMonthKey] ?? 0;

  const toPrizeWon = (v: number): number => (v > 0 && v < 10000 ? v * 10000 : v);
  /** 1주차 인보험 시상금: 실적 10만 미만이면 0원, 아니면 PRIZE_SUM 우선 후 구간별 달성금액 */
  const week1InsPrizeRaw = toPrizeWon(Number(partner?.productWeek1InsPrize ?? 0));
  const week1InsPrize = week1InsPerf < 100000 ? getPartnerTierPrize(week1InsPerf) : (week1InsPrizeRaw > 0 ? week1InsPrizeRaw : getPartnerTierPrize(week1InsPerf));
  /** 1주차 상품 시상금: 실적 10만 미만이면 0원, 아니면 PRIZE_SUM 우선 후 구간별 달성금액 */
  const week1ProductPrizeRaw = toPrizeWon(Number(partner?.productWeek1Prize ?? 0));
  const week1ProductPrize = week1ProductPerf < 100000 ? getPartnerTierPrize(week1ProductPerf) : (week1ProductPrizeRaw > 0 ? week1ProductPrizeRaw : getPartnerTierPrize(week1ProductPerf));

  /** 2주차 인보험 실적: Supabase weekly.week2 */
  const week2InsPerf = Number(weekly?.week2 ?? 0);
  /** 2주차 상품 실적: Supabase product_week2 (PRIZE_SUM AH열) */
  const week2ProductPerf = Number((selectedAgent as { productWeek2?: number | null }).productWeek2 ?? 0);
  /** 2주차 시상금: 10→5만, 20→10만, 30→30만, 50→50만 원. PRIZE_SUM 우선, 없으면 getPartnerTierPrizeWeek2 */
  const week2InsPrizeRaw = toPrizeWon(Number(partner?.productWeek2InsPrize ?? 0));
  const week2InsPrize = week2InsPrizeRaw > 0 ? week2InsPrizeRaw : getPartnerTierPrizeWeek2(week2InsPerf);
  const week2ProductPrizeRaw = toPrizeWon(Number(partner?.productWeek2Prize ?? 0));
  const week2ProductPrize = week2ProductPrizeRaw > 0 ? week2ProductPrizeRaw : getPartnerTierPrizeWeek2(week2ProductPerf);

  const baseJan = Number(partner?.continuous12Jan ?? janPerf);
  const baseFeb = Number(partner?.continuous12Feb ?? febPerf);
  /** 1~2월 추가 연속: partner에 없으면 연속가동(또는 월별 실적)으로 폴백 */
  const extraJan = Number(partner?.continuous12ExtraJan ?? partner?.continuous12Jan ?? janPerf);
  const extraFeb = Number(partner?.continuous12ExtraFeb ?? partner?.continuous12Feb ?? febPerf);

  const febRun = Number(partner?.continuous23Feb ?? febPerf);
  /** 2~3월 추가 연속: partner에 없으면 연속가동 2월(또는 실적)으로 폴백 */
  const febExtraRun = Number(partner?.continuous23ExtraFeb ?? partner?.continuous23Feb ?? febPerf);
  /** 3월 연속가동·추가 연속가동 공통 기간: 3월 1~15일 실적 */
  const march15Perf = Number(partner?.continuous23Mar ?? 0) || marchPerf;
  /** 2~3월 추가 연속 3월 실적(별도 컬럼 없으면 공통 march15Perf 사용) */
  const marchExtraPerf = Number(partner?.continuous23ExtraMar ?? 0) || march15Perf;

  const basePrizeRaw = toPrizeWon(Number(partner?.continuous12Prize ?? 0));
  const basePrizeComputed = basePrizeRaw > 0 ? basePrizeRaw : getPartnerContinuousPrize(baseJan);
  const extraPrizeRaw = toPrizeWon(Number(partner?.continuous12ExtraPrize ?? 0));
  const extraPrizeComputed = extraPrizeRaw > 0 ? extraPrizeRaw : getPartnerContinuousPrizeExtra(extraJan);
  /** 1~2월은 이미 종료된 시상. 조건 미달 시 예상 시상금 0, 둘 다 0이면 카드 투명도 50% */
  const baseConditionMet = baseJan >= 100000 && baseFeb >= 100000;
  const extraConditionMet = extraJan >= 100000 && extraFeb >= 100000;
  const basePrize = baseConditionMet ? basePrizeComputed : 0;
  const extraPrize = extraConditionMet ? extraPrizeComputed : 0;

  const run23Tiers: [number, number][] = [[100000, 200000], [200000, 600000], [300000, 800000], [500000, 1800000]];
  const run23PrizeFromTier = (feb: number, march: number): number => {
    if (march < 100000) return 0;
    const tier = run23Tiers.find(([t]) => feb >= t);
    return tier ? tier[1] : 0;
  };
  const run23BasePrizeRaw = toPrizeWon(Number(partner?.continuous23Prize ?? 0));
  const run23ExtraPrizeRaw = toPrizeWon(Number(partner?.continuous23ExtraPrize ?? 0));
  const run23BasePrize = run23BasePrizeRaw > 0 ? run23BasePrizeRaw : run23PrizeFromTier(febRun, march15Perf);
  /** 추가 연속가동 시상금: partner 값 없으면 2월 추가 실적(febExtraRun) + 3월 실적(marchExtraPerf) 기준 계산 */
  const run23ExtraPrize = run23ExtraPrizeRaw > 0 ? run23ExtraPrizeRaw : run23PrizeFromTier(febExtraRun, marchExtraPerf);

  /*
   * 파트너 카드별 시상금 매핑 (표시 금액은 모두 원 단위로 전달 → formatMan으로 "만원" 표시)
   * 1. PartnerRegularPlusCard: incentiveData 미사용. 카드 내부에서 currentPerf × 450% 계산.
   * 2. PartnerWeekCombinedCard(1주차): tierPerf1=weekly.week1, tierPerf2=productWeek1. prize1/2=PRIZE_SUM 우선, 없으면 getPartnerTierPrize(실적) 구간별 달성금액(10/20/30/50만원).
   * 2b. PartnerWeekCombinedCard(2주차): tierPerf1=weekly.week2, tierPerf2=productWeek2. prize1/2=PRIZE_SUM 우선, 없으면 getPartnerTierPrizeWeek2(실적) 구간별(10→5만, 20→10만, 30→30만, 50→50만원).
   * 3. DirectMeritzClubPlusCard: meritzClubPlusPrize=incentiveData.clubPlusPrize (엔진 계산).
   * 4. DirectDoubleMeritzCard: doubleMeritzPrize=incentiveData.doubleMeritzPrize (엔진 계산).
   * 5. ContinuousRun12Card: basePrize=continuous12Prize, extraPrize=continuous12ExtraPrize (PRIZE_SUM BN/BT열, toPrizeWon 적용).
   * 6. ContinuousRun23Card: basePrize/extraPrize = partner 값 우선, 없으면 run23Tiers 기준 계산(원 단위).
   */

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
      {selectedViewMonth !== 3 && (
        <ContinuousRun12Card
          baseJan={baseJan}
          baseFeb={baseFeb}
          basePrize={basePrize}
          extraJan={extraJan}
          extraFeb={extraFeb}
          extraPrize={extraPrize}
          isEndedWithNoPrize={basePrize === 0 && extraPrize === 0}
        />
      )}
      <ContinuousRun23Card
        febPerf={febRun}
        febExtraPerf={febExtraRun}
        march15Perf={march15Perf}
        march8Perf={marchExtraPerf}
        basePrize={run23BasePrize}
        extraPrize={run23ExtraPrize}
      />
    </div>
  );
}
