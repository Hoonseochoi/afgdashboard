import type { Agent, ViewMonth } from "@/types";
import { RANK_EXCLUDE_CODE } from "@/app/_components/dashboard/constants";
import { calculateIncentiveData } from "./incentiveEngine";

export interface OverallRankItem {
  code: string;
  name: string;
  branch: string;
  performance: number;
  rank: number;
}

export interface PrizeRankItem {
  code: string;
  name: string;
  branch: string;
  totalPrize: number;
  rank: number;
}

export interface BranchStatsItem {
  branch: string;
  agentCount: number;
  totalPerformance: number;
  averagePerformance: number;
}

export interface AdminStatsResult {
  monthKey: string;
  overallTop: OverallRankItem[];
  prizeTop: PrizeRankItem[];
  branchStats: BranchStatsItem[];
}

interface BuildAdminStatsOptions {
  agents: Agent[];
  month: ViewMonth;
  globalRanks: Record<string, number[]>;
  updateDate: string;
}

export function buildAdminStats({ agents, month, globalRanks, updateDate }: BuildAdminStatsOptions): AdminStatsResult {
  const monthKey = `2026-${String(month).padStart(2, "0")}`;

  const baseAgents = agents.filter((a) => a.code !== RANK_EXCLUDE_CODE);

  const withPerf = baseAgents
    .map((agent) => ({
      agent,
      perf: agent.performance?.[monthKey] ?? 0,
    }))
    .filter(({ perf }) => perf > 0);

  const overallSorted = [...withPerf].sort((a, b) => b.perf - a.perf);

  const overallTop: OverallRankItem[] = overallSorted.slice(0, 20).map(({ agent, perf }, idx) => ({
    code: agent.code,
    name: agent.name,
    branch: agent.branch,
    performance: perf,
    rank: idx + 1,
  }));

  const prizeWithTotal = overallSorted.map(({ agent, perf }) => {
    const incentive = calculateIncentiveData(agent, baseAgents, month, globalRanks, updateDate);
    return {
      agent,
      totalPrize: incentive.totalPrize ?? 0,
      perf,
    };
  });

  const prizeSorted = prizeWithTotal
    .filter(({ totalPrize }) => totalPrize > 0)
    .sort((a, b) => b.totalPrize - a.totalPrize);

  const prizeTop: PrizeRankItem[] = prizeSorted.slice(0, 20).map(({ agent, totalPrize }, idx) => ({
    code: agent.code,
    name: agent.name,
    branch: agent.branch,
    totalPrize,
    rank: idx + 1,
  }));

  const branchMap = new Map<string, { total: number; count: number }>();
  for (const { agent, perf } of withPerf) {
    const branch = agent.branch || "미지정";
    const entry = branchMap.get(branch) || { total: 0, count: 0 };
    entry.total += perf;
    entry.count += 1;
    branchMap.set(branch, entry);
  }

  const branchStats: BranchStatsItem[] = Array.from(branchMap.entries())
    .map(([branch, { total, count }]) => ({
      branch,
      agentCount: count,
      totalPerformance: total,
      averagePerformance: count > 0 ? total / count : 0,
    }))
    .sort((a, b) => b.totalPerformance - a.totalPerformance);

  return {
    monthKey,
    overallTop,
    prizeTop,
    branchStats,
  };
}

