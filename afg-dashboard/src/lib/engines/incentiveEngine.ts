import { Agent, PerformanceData, WeeklyPerformance } from "@/types";

const formatMan = (v: number) => {
  if (!v) return "0";
  return String(Math.floor(v / 10000));
};

// --- Constants ---

export const ALL_REWARD_TIERS = [200000, 300000, 400000, 500000, 600000, 800000, 1000000, 1200000, 1500000, 1800000, 2000000, 2500000];
export const MAX_TIER = 2500000;

export const WEEK_TIERS = [200000, 300000, 500000, 800000, 1000000, 1200000];

// 1월 주차 시상 (threshold → prize)
export const JAN_W1_PRIZES: [number, number][] = [[1200000, 6000000], [1000000, 4000000], [800000, 2400000], [500000, 1000000], [300000, 300000], [200000, 200000]];
export const JAN_W2_PRIZES: [number, number][] = [[1200000, 4800000], [1000000, 2500000], [800000, 1600000], [500000, 800000], [300000, 300000], [200000, 200000]];
export const JAN_W3_PRIZES: [number, number][] = [[1200000, 3600000], [1000000, 2000000], [800000, 1000000], [500000, 500000], [300000, 300000], [200000, 100000]];

// 2월 주차 시상
export const FEB_W1_PRIZES: [number, number][] = [[1200000, 6000000], [1000000, 4000000], [800000, 2400000], [500000, 1000000], [300000, 300000], [200000, 200000]];
export const FEB_W2_PRIZES: [number, number][] = [[1200000, 4800000], [1000000, 3000000], [800000, 1600000], [500000, 1000000], [300000, 300000], [200000, 200000]];

// 3월 주차 시상
export const MAR_W1_SPECIAL_PRIZES: [number, number][] = [[1200000, 6000000], [1000000, 4000000], [800000, 2400000], [500000, 1000000], [300000, 300000], [200000, 200000]];
export const MAR_W1_PATAYA_PRIZES: [number, number][] = [[1000000, 5000000], [700000, 2100000], [500000, 1000000], [300000, 300000], [200000, 200000]];

export const MONTHLY_TIERS = [1000000, 1200000, 1500000, 1800000, 2000000, 2500000];
export const PLUS_TIERS = [200000, 400000, 600000, 800000, 1000000];

/** 3월 AFG 조기가동: 구간(만원) 10/20/30/40/50 → 시상률에 따라 시상금 */
export const EARLY_RUN_TIERS = [100000, 200000, 300000, 400000, 500000];
/** 1주 400%, 2주 300%, 3주 250%, 4주 200% */
export const EARLY_RUN_WEEK_RATES = [400, 300, 250, 200];

const ZERO_WEEK_DATA_3 = [
  { week: 1, performance: 0 },
  { week: 2, performance: 0 },
  { week: 3, performance: 0 },
];
const ZERO_WEEK_DATA_4 = [
  { week: 1, performance: 0 },
  { week: 2, performance: 0 },
  { week: 3, performance: 0 },
  { week: 4, performance: 0 },
];

/**
 * 해당 월의 주차 실적만 반환 (상단 시상·하단 실적추이 공통 소스)
 * 1·2월: _janWeekly/_febWeekly 또는 당월 실적 0이면 0. 3월: weekly_data 또는 weekly.
 */
export function getWeekDataForMonth(
  agent: Agent,
  monthNum: 1 | 2 | 3,
  monthPerf: number
): { week: number; performance: number }[] {
  const raw = agent as any;
  const janWeekly = raw._janWeekly;
  const febWeekly = raw._febWeekly;
  const stdWeekly = raw.weekly ?? {};
  if (monthNum === 1) {
    if (monthPerf === 0) return ZERO_WEEK_DATA_3;
    if (janWeekly) {
      return [
        { week: 1, performance: janWeekly.week1 ?? 0 },
        { week: 2, performance: janWeekly.week2 ?? 0 },
        { week: 3, performance: janWeekly.week3 ?? 0 },
      ];
    }
    return ZERO_WEEK_DATA_3;
  }
  if (monthNum === 2) {
    if (monthPerf === 0) return ZERO_WEEK_DATA_3;
    if (febWeekly) {
      return [
        { week: 1, performance: febWeekly.week1 ?? 0 },
        { week: 2, performance: febWeekly.week2 ?? 0 },
        { week: 3, performance: febWeekly.week3 ?? 0 },
      ];
    }
    return ZERO_WEEK_DATA_3;
  }
  if (agent.weekly_data?.length) {
    const w = agent.weekly_data;
    return [
      { week: 1, performance: w.find((x) => x.week === 1)?.performance ?? 0 },
      { week: 2, performance: w.find((x) => x.week === 2)?.performance ?? 0 },
      { week: 3, performance: w.find((x) => x.week === 3)?.performance ?? 0 },
      { week: 4, performance: w.find((x) => x.week === 4)?.performance ?? 0 },
    ];
  }
  return [
    { week: 1, performance: stdWeekly.week1 ?? 0 },
    { week: 2, performance: stdWeekly.week2 ?? 0 },
    { week: 3, performance: stdWeekly.week3 ?? 0 },
    { week: 4, performance: stdWeekly.week4 ?? 0 },
  ];
}

// --- Calculation Functions ---

/**
 * 인센티브 티어 및 다음 단계 계산 (공통)
 */
export const calculateIncentiveTier = (perf: number, tiers: [number, number][]) => {
  let prize = 0;
  let nextLevel = "";
  let progress = 0;

  const sortedTiers = [...tiers].sort((a, b) => a[0] - b[0]);
  
  for (let i = 0; i < sortedTiers.length; i++) {
    const [threshold, p] = sortedTiers[i];
    if (perf >= threshold) {
      prize = p;
    } else {
      nextLevel = `${Math.floor(threshold / 10000)}만`;
      const prevThreshold = i > 0 ? sortedTiers[i - 1][0] : 0;
      progress = Math.min(100, Math.round(((perf - prevThreshold) / (threshold - prevThreshold)) * 100));
      break;
    }
  }

  if (!nextLevel) {
    nextLevel = "최고 등급";
    progress = 100;
  }

  return { prize, nextLevel, progress };
};

/**
 * 주차별 시상금 계산 (순수 함수)
 */
export const getWeekPrize = (perf: number, tiers: [number, number][]) => {
  return calculateIncentiveTier(perf, tiers);
};

export const MONTHLY_PRIZE_TIERS: [number, number][] = [
  [1000000, 1500000],
  [1200000, 2000000],
  [1500000, 3000000],
  [1800000, 3600000],
  [2000000, 4000000],
  [2500000, 5000000]
];

/**
 * 월간 현금시상 계산
 */
export const calculateMonthlyPrize = (perf: number) => {
  return calculateIncentiveTier(perf, MONTHLY_PRIZE_TIERS);
};

/**
 * 2배 메리츠클럽 시상금 계산
 */
export const calculateDoubleMeritzPrize = (prevPerf: number, currentPerf: number): number => {
  if (prevPerf >= 200000 && currentPerf >= 200000) {
    let baseTier = Math.floor(currentPerf / 100000) * 100000;
    if (baseTier > 1000000) baseTier = 1000000;
    return baseTier * 2;
  }
  return 0;
};

/**
 * 메리츠클럽 PLUS 시상금 계산
 */
export const calculateMeritzClubPlusPrize = (minPerf: number): number => {
  if (minPerf >= 1000000) return 3000000;
  if (minPerf >= 800000) return 2400000;
  if (minPerf >= 600000) return 1800000;
  if (minPerf >= 400000) return 1200000;
  if (minPerf >= 200000) return 600000;
  return 0;
};

/**
 * 파트너 지사 티어 시상금 계산
 */
export const getPartnerTierPrize = (perf: number): number => {
  if (perf >= 500000) return 500000;
  if (perf >= 300000) return 300000;
  if (perf >= 200000) return 200000;
  if (perf >= 100000) return 100000;
  return 0;
};

/**
 * 파트너 연속가동 시상금 계산
 */
export const getPartnerContinuousPrize = (perf: number): number => {
  if (perf >= 500000) return 1800000;
  if (perf >= 300000) return 800000;
  if (perf >= 200000) return 600000;
  if (perf >= 100000) return 200000;
  return 0;
};

/**
 * 3월 AFG 조기가동 시상금: 실적 구간(10/20/30/40/50만 이상) × 시상률(%)
 * 예: 20만이상 구간, 400% → 200000 × 4 = 80만원
 */
export const getEarlyRunPrize = (perf: number, ratePercent: number): number => {
  const sorted = [...EARLY_RUN_TIERS].sort((a, b) => b - a);
  for (const tier of sorted) {
    if (perf >= tier) return Math.floor((tier * ratePercent) / 100);
  }
  return 0;
};

/**
 * 파타야 여행 시상금 로직 (3월 특별)
 */
export const calculatePatayaTravelIncentive = (w1Perf: number): any => {
  return calculateIncentiveTier(w1Perf, MAR_W1_PATAYA_PRIZES);
};

/**
 * 3월 1주차 특별 시상금
 */
export const calculateMarW1SpecialPrize = (w1Perf: number): any => {
  return calculateIncentiveTier(w1Perf, MAR_W1_SPECIAL_PRIZES);
};

/**
 * 정규시상 계산
 */
export const calculateRegularPrize = (perf: number, isPartner: boolean): number => {
  return isPartner ? Math.round(perf * 4.5) : perf;
};

/**
 * 누적실적 목표 달성률 계산
 */
export const calculateProgress = (perf: number, goal: number): number => {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((perf / goal) * 100));
};

/**
 * 달성 티어 반환 (메리츠클럽+ 전용)
 */
export const getAchievedTier = (perf: number): number => {
  const tiers = [1000000, 800000, 600000, 400000, 200000];
  for (const t of tiers) {
    if (perf >= t) return t;
  }
  return 0;
};

/** 메리츠클럽+ 목표 티어: 20/40/60/80/100만 중 perf 이하 최대값 (동일 로직) */
export const snapDownToMeritzTier = getAchievedTier;

/**
 * 차트용 실적 데이터 가공
 */
export interface ChartDataItem {
  name: string;
  value: number;
  prize: number;
}

export const preparePerformanceChartData = (agent: Agent): ChartDataItem[] => {
  const performance = agent.performance || {};
  const months = [
    { label: "8월", key: "2025-08", month: null as null | number },
    { label: "9월", key: "2025-09", month: null },
    { label: "10월", key: "2025-10", month: null },
    { label: "11월", key: "2025-11", month: null },
    { label: "12월", key: "2025-12", month: null },
    { label: "1월", key: "2026-01", month: 1 },
    { label: "2월", key: "2026-02", month: 2 },
    { label: "3월", key: "2026-03", month: 3 },
  ];

  const janPerf = performance["2026-01"] ?? 0;
  const febPerf = performance["2026-02"] ?? 0;

  const computePrize = (monthNum: number, perf: number): number => {
    const weekData = getWeekDataForMonth(agent, monthNum as 1 | 2 | 3, perf);
    const w1 = weekData.find((x) => x.week === 1)?.performance ?? 0;
    const w2 = weekData.find((x) => x.week === 2)?.performance ?? 0;
    const w3 = weekData.find((x) => x.week === 3)?.performance ?? 0;

    let weekPrizeSum = 0;
    if (monthNum === 1) {
      weekPrizeSum = getWeekPrize(w1, JAN_W1_PRIZES).prize +
                    getWeekPrize(w2, JAN_W2_PRIZES).prize +
                    getWeekPrize(w3, JAN_W3_PRIZES).prize;
    } else if (monthNum === 2) {
      weekPrizeSum = getWeekPrize(w1, FEB_W1_PRIZES).prize +
                    getWeekPrize(w2, FEB_W2_PRIZES).prize;
    } else if (monthNum === 3) {
      weekPrizeSum = calculateMarW1SpecialPrize(w1).prize;
      const w4 = weekData.find((x) => x.week === 4)?.performance ?? 0;
      const marchPatayaPrize = calculatePatayaTravelIncentive(w1).prize;
      const marchEarlyRunTotal = [w1, w2, w3, w4]
        .map((p, i) => getEarlyRunPrize(p, EARLY_RUN_WEEK_RATES[i]))
        .reduce((a, b) => a + b, 0);
      const monthly_ = calculateMonthlyPrize(perf).prize;
      const prevKey = "2026-02";
      const prevPerf = performance[prevKey] ?? 0;
      const dm = calculateDoubleMeritzPrize(prevPerf, perf);
      const plusSecuredTarget = snapDownToMeritzTier(Math.min(janPerf, febPerf, perf));
      const cp = calculateMeritzClubPlusPrize(plusSecuredTarget);
      const regular = perf;
      return weekPrizeSum + marchPatayaPrize + marchEarlyRunTotal + dm + cp + regular;
    }

    const monthly_ = calculateMonthlyPrize(perf).prize;
    const prevKey = monthNum === 1 ? "2025-12" : `2026-${String(monthNum - 1).padStart(2, "0")}`;
    const prevPerf = performance[prevKey] ?? 0;
    const dm = calculateDoubleMeritzPrize(prevPerf, perf);
    const plusQuarterTarget = monthNum === 1
      ? snapDownToMeritzTier(janPerf)
      : snapDownToMeritzTier(Math.min(janPerf, febPerf));
    const cp = monthNum === 3 ? calculateMeritzClubPlusPrize(plusQuarterTarget) : 0;
    const regular = perf;

    return weekPrizeSum + monthly_ + dm + cp + regular;
  };

  return months.map((m) => {
    const value = performance[m.key] || 0;
    const prize = m.month !== null ? computePrize(m.month, value) : 0;
    return { name: m.label, value, prize };
  });
};


/**
 * 특정 월의 총 예상 시상금 합산 (비파트너 기준)
 */
export const calculateTotalPrizeForMonth = (params: {
  month: number;
  weekPrizes: any[];
  monthlyPrize: any;
  doubleMeritz: number;
  clubPlus: number;
  regular: number;
}): number => {
  const { month, weekPrizes, monthlyPrize, doubleMeritz, clubPlus, regular } = params;
  const weeklySum = weekPrizes.reduce((a, b) => a + (typeof b === "number" ? b : b.prize || 0), 0);
  const mPrize = typeof monthlyPrize === "number" ? monthlyPrize : monthlyPrize.prize || 0;
  
  if (month === 3) {
    return weeklySum + doubleMeritz + clubPlus + regular;
  }
  
  return weeklySum + mPrize + doubleMeritz + clubPlus + regular;
};

/**
 * 목표 실적 및 달성률 계산
 */
export const calculateGoalAndProgress = (
  currentPerf: number,
  rankIndex: number,
  monthRanks: number[],
  isPartner: boolean
) => {
  let monthlyGoal = 400000;
  let goalLabel = "40만원";
  let targetRankDisplay: number | null = null;
  let isRank1 = false;

  if (rankIndex === 0) {
    isRank1 = true;
    goalLabel = isPartner ? "파트너 TOP" : "전국TOP";
    monthlyGoal = currentPerf;
  } else if (currentPerf >= MAX_TIER && rankIndex > 0) {
    monthlyGoal = monthRanks[rankIndex - 1];
    targetRankDisplay = rankIndex;
    goalLabel = `RANK ${rankIndex}위`;
  } else if (currentPerf > 400000) {
    const nextTier = ALL_REWARD_TIERS.find((t) => t > currentPerf);
    monthlyGoal = nextTier || MAX_TIER;
    goalLabel = `${Math.round(monthlyGoal / 10000)}만원`;
  } else {
    monthlyGoal = 400000;
    goalLabel = "40만원";
  }

  const progress = calculateProgress(currentPerf, monthlyGoal);
  return { monthlyGoal, goalLabel, targetRankDisplay, isRank1, progress };
};

/**
 * 2026 MY HOT (연도시상) 계산
 */
export const calculateMYHOTRank = (
  agentCode: string,
  agents: any[],
  selectedViewMonth: number,
  excludeCode: string
) => {
  const MY_HOT_TIERS = [5000000, 6500000, 8000000, 10000000];
  const yearMonths = Array.from({ length: selectedViewMonth }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`);
  
  const calculateSum = (a: any) => {
    let s = 0;
    for (const m of yearMonths) s += a.performance?.[m] ?? 0;
    return s;
  };

  const currentAgent = agents.find(a => a.code === agentCode);
  const myHotSum = currentAgent ? calculateSum(currentAgent) : 0;
  
  const agentSums = agents
    .filter((a: any) => a.code !== excludeCode)
    .map((a: any) => ({ code: a.code, sum: calculateSum(a) }));
    
  agentSums.sort((a, b) => b.sum - a.sum);
  let myHotRank = agentSums.findIndex((a) => a.code === agentCode) + 1;
  if (myHotRank === 0) myHotRank = 999;
  
  const myHotIsChamp = myHotRank === 1;
  const myHotNextTier = MY_HOT_TIERS.find((t) => t > myHotSum) ?? null;
  const myHotProgress = myHotNextTier ? Math.min(100, Math.round((myHotSum / myHotNextTier) * 100)) : 100;
  const myHotLabel = myHotIsChamp ? "CHAMP" : myHotNextTier ? `meritz ${myHotNextTier / 10000}` : "CHAMP (1위)";

  return { myHotSum, myHotRank, myHotIsChamp, myHotNextTier, myHotProgress, myHotLabel };
};

/**
 * 상단 배너 "더 채우세요" 정보 계산
 */
export const calculateBannerInfo = (params: {
  currentMonthPerf: number;
  remainingMonthly: number;
  remainingPlus: number;
  rankInMonth: number;
  sortedByMonth: any[];
  rankKeyMonth: string;
}) => {
  const { currentMonthPerf, remainingMonthly, remainingPlus, rankInMonth, sortedByMonth, rankKeyMonth } = params;
  const allTiersFilled = remainingMonthly === 0;
  let remainToShow = 0;
  let remainLabel: "more" | "gap" = "more";

  if (allTiersFilled) {
    if (rankInMonth === 1 && sortedByMonth.length >= 2) {
      const secondPerf = sortedByMonth[1]?.performance?.[rankKeyMonth] ?? 0;
      const gap = Math.max(0, currentMonthPerf - secondPerf);
      if (gap > 0) {
        remainToShow = gap;
        remainLabel = "gap";
      }
    } else if (rankInMonth >= 2) {
      const nextRankPerf = sortedByMonth[rankInMonth - 2]?.performance?.[rankKeyMonth] ?? 0;
      const gapToNext = Math.max(0, nextRankPerf - currentMonthPerf);
      if (gapToNext > 0) {
        remainToShow = gapToNext;
        remainLabel = "more";
      }
    }
  } else {
    const candidates = [remainingMonthly, remainingPlus].filter((r) => r > 0);
    if (candidates.length > 0) {
      remainToShow = Math.min(...candidates);
      remainLabel = "more";
    }
  }

  return { remainToShow, remainLabel };
};

/**
 * 전체 인센티브 데이터를 통합 계산하는 함수
 */
export const calculateIncentiveData = (
  agent: Agent,
  allAgents: Agent[],
  selectedMonth: number,
  globalRanks: Record<string, number[]>,
  updateDate: string
) => {
  const isPartner = (agent.branch || "").includes("파트너");
  const monthKey = `2026-${String(selectedMonth).padStart(2, "0")}`;
  const currentPerf = agent.performance?.[monthKey] ?? 0;
  const janPerf = agent.performance?.["2026-01"] ?? 0;
  const febPerf = agent.performance?.["2026-02"] ?? 0;
  const marchPerf = agent.performance?.["2026-03"] ?? 0;

  // 주간 실적: 상단 시상·하단 실적추이와 동일한 getWeekDataForMonth 사용
  const weekData = getWeekDataForMonth(agent, selectedMonth as 1 | 2 | 3, currentPerf);


  
  const weekPrizes = weekData.map(w => {
    if (selectedMonth === 1) {
      if (w.week === 1) return getWeekPrize(w.performance, JAN_W1_PRIZES);
      if (w.week === 2) return getWeekPrize(w.performance, JAN_W2_PRIZES);
      if (w.week === 3) return getWeekPrize(w.performance, JAN_W3_PRIZES);
    } else if (selectedMonth === 2) {
      if (w.week === 1) return getWeekPrize(w.performance, FEB_W1_PRIZES);
      if (w.week === 2) return getWeekPrize(w.performance, FEB_W2_PRIZES);
    } else if (selectedMonth === 3) {
      if (w.week === 1) return calculateMarW1SpecialPrize(w.performance);
    }
    return { prize: 0, nextLevel: "", progress: 0 };
  });

  const monthlyPrize = calculateMonthlyPrize(currentPerf);

  // 2배 메리츠클럽
  const prevMonthKey = `2026-${String(selectedMonth - 1).padStart(2, "0")}`;
  const prevPerf = agent.performance?.[prevMonthKey] ?? 0;
  const doubleMeritzPrize = calculateDoubleMeritzPrize(prevPerf, currentPerf);

  // 메리츠클럽 PLUS: 1·2월은 min(1,2월) 스냅 기준 예상, 3월은 확보 시상금 = min(1,2,3월) 스냅×300%
  const plusQuarterTarget = snapDownToMeritzTier(selectedMonth === 1 ? janPerf : Math.min(janPerf, febPerf));
  const plusSecuredTarget = selectedMonth === 3 ? snapDownToMeritzTier(Math.min(janPerf, febPerf, marchPerf)) : plusQuarterTarget;
  const clubPlusPrize = calculateMeritzClubPlusPrize(plusSecuredTarget);

  // 정규 시상
  const regularPrizeSize = calculateRegularPrize(currentPerf, isPartner);

  // 파타야 및 3월 특별 시상 (3월 1주차 기준) — 총합 계산 전에 필요
  const week1Perf = weekData.find(w => w.week === 1)?.performance ?? 0;
  const patayaResult = selectedMonth === 3 ? calculatePatayaTravelIncentive(week1Perf) : null;
  const marchW1SpecialResult = selectedMonth === 3 ? calculateMarW1SpecialPrize(week1Perf) : null;
  const patayaPrize = patayaResult ? patayaResult.prize : 0;
  const marchW1SpecialPrize = marchW1SpecialResult ? marchW1SpecialResult.prize : 0;

  // 3월 AFG 조기가동: 1주 400%, 2주 300%, 3주 250%, 4주 200% × 구간(10/20/30/40/50만)
  const earlyRunWeekPerfs = [1, 2, 3, 4].map((wNum) => weekData.find(w => w.week === wNum)?.performance ?? 0);
  const earlyRunWeekPrizes = selectedMonth === 3
    ? earlyRunWeekPerfs.map((perf, i) => getEarlyRunPrize(perf, EARLY_RUN_WEEK_RATES[i]))
    : [0, 0, 0, 0];
  const earlyRunTotalPrize = earlyRunWeekPrizes.reduce((a, b) => a + b, 0);

  // 총 합계: 메리츠클럽+는 3월에만 반영, 1·2월은 예상 표시만 하고 합산 제외
  const clubPlusForTotal = selectedMonth === 3 ? clubPlusPrize : 0;
  let totalPrize = calculateTotalPrizeForMonth({
    month: selectedMonth,
    weekPrizes,
    monthlyPrize,
    doubleMeritz: doubleMeritzPrize,
    clubPlus: clubPlusForTotal,
    regular: regularPrizeSize
  });
  // 3월 다이렉트: 파타야 + 조기가동 시상이 카드에 있으므로 총합에 포함
  if (selectedMonth === 3 && !isPartner) {
    totalPrize += patayaPrize + earlyRunTotalPrize;
  }

  // 순위 및 목표
  const monthRanks = globalRanks[monthKey] || [];
  const rankInMonth = monthRanks.indexOf(currentPerf) + 1 || 999;
  
  const goalInfo = calculateGoalAndProgress(currentPerf, rankInMonth - 1, monthRanks, isPartner);

  // MY HOT
  const myHotData = calculateMYHOTRank(agent.code, allAgents, selectedMonth, "exclude_code_placeholder");

  // 메리츠클럽 PLUS 상세 (목표 = 분기 목표 티어, 진행률 = 당월 실적/목표)
  const plusTargetMinPerf = plusQuarterTarget;
  const plusProgress = plusQuarterTarget > 0 ? (currentPerf / plusQuarterTarget) * 100 : 0;

  // 주차별 상세 (NonPartnerCards용)
  const week1 = weekData.find(w => w.week === 1);
  const week2 = weekData.find(w => w.week === 2);
  const week3 = weekData.find(w => w.week === 3);

  return {
    currentPerf,
    weekPrizes,
    monthlyPrize,
    doubleMeritzPrize,
    clubPlusPrize,
    regularPrizeSize,
    totalPrize,
    rankInMonth,
    goalInfo,
    myHotData,
    patayaPrize,
    marchW1SpecialPrize,
    earlyRunWeekPrizes,
    earlyRunWeekPerfs,
    earlyRunTotalPrize,
    janPerf,
    febPerf,
    marchPerf,
    plusTargetMinPerf,
    plusProgress,
    week1Perf,
    // 추가 주차 데이터
    week1Prize: weekPrizes[0]?.prize || 0,
    week1Next: weekPrizes[0]?.nextLevel || "",
    week1Progress: weekPrizes[0]?.progress || 0,
    viewW1: week1?.performance || 0,
    week2Prize: weekPrizes[1]?.prize || 0,
    week2Next: weekPrizes[1]?.nextLevel || "",
    week2Progress: weekPrizes[1]?.progress || 0,
    viewW2: week2?.performance || 0,
    week3Prize: weekPrizes[2]?.prize || 0,
    week3Next: weekPrizes[2]?.nextLevel || "",
    week3Progress: weekPrizes[2]?.progress || 0,
    viewW3: week3?.performance || 0,
    monthlyNext: monthlyPrize.nextLevel || "",
    monthlyProgress: monthlyPrize.progress || 0,
    plusNext: currentPerf >= plusTargetMinPerf ? "완성" : `${formatMan(plusTargetMinPerf - currentPerf)}만 더`,
    plusGoal: plusTargetMinPerf,
    performanceData: preparePerformanceChartData(agent),
    updateDate
  };
};
