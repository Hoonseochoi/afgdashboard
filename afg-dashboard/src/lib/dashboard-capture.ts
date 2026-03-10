import {
  supabaseAgentsListAll,
  supabaseConfigGetApp,
  isSupabaseConfigured,
  type SupabaseAgentRecord,
} from '@/lib/supabase-server';

const RANK_EXCLUDE_CODE = '712345678';
const RANK_MONTHS = ['2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'];

type AgentWithPerf = { code?: string; performance?: Record<string, number> | null; weekly?: Record<string, number> | null };

function mergeFebruaryFix<T extends AgentWithPerf & Record<string, any>>(agents: T[]): T[] {
  try {
    // 대시보드용과 동일한 보정 로직이 필요하면 여기로 옮길 수 있음.
    // 현재는 서버 route.ts 와 동일한 구조를 유지하기 위해 남겨둔 훅.
    // 실제 파일 의존은 최소화하기 위해 기본 구현은 패스스루로 둔다.
    return agents;
  } catch {
    return agents;
  }
}

function mergeJanuaryFix<T extends AgentWithPerf & Record<string, any>>(agents: T[]): T[] {
  try {
    return agents;
  } catch {
    return agents;
  }
}

function toSafeAgent(d: SupabaseAgentRecord) {
  const { password, ...rest } = d;
  return rest;
}

function computeRanks(items: SupabaseAgentRecord[]): Record<string, number[]> {
  const allPerformances: Record<string, number[]> = Object.fromEntries(RANK_MONTHS.map((m) => [m, []]));
  items.forEach((data) => {
    if (data.code === RANK_EXCLUDE_CODE) return;
    if (data.performance) {
      RANK_MONTHS.forEach((month) => {
        allPerformances[month].push(data.performance![month] ?? 0);
      });
    }
  });
  RANK_MONTHS.forEach((month) => {
    allPerformances[month].sort((a, b) => b - a);
  });
  return allPerformances;
}

const SORT_MONTH = '2026-03';
function sortByMarchPerformance<T extends { code?: string; performance?: Record<string, number> | null }>(agents: T[]): T[] {
  return [...agents].sort((a, b) => {
    const va = a.performance?.[SORT_MONTH] ?? 0;
    const vb = b.performance?.[SORT_MONTH] ?? 0;
    if (vb !== va) return vb - va;
    return (a.code ?? '').localeCompare(b.code ?? '');
  });
}

/** 캡처용: 로그인 없이 최신 DB 기준 전체 데이터 반환 (admin/develope와 동일한 데이터 스냅샷) */
export async function getFullDashboardDataForCapture() {
  if (!isSupabaseConfigured()) return null;
  const configApp = await supabaseConfigGetApp();
  const updateDate = configApp?.updateDate ?? '0000';
  const isPartnerFn = (a: SupabaseAgentRecord) => a.branch && String(a.branch).includes('파트너');
  let items = await supabaseAgentsListAll({ filterRole: 'agent' });
  items = mergeFebruaryFix(items) as SupabaseAgentRecord[];
  items = mergeJanuaryFix(items) as SupabaseAgentRecord[];
  const ranks = computeRanks(items);
  const directRanks = computeRanks(items.filter((a) => !isPartnerFn(a)));
  const partnerRanks = computeRanks(items.filter((a) => isPartnerFn(a)));
  const filtered = items.filter((a) => a.code !== RANK_EXCLUDE_CODE);
  let agentsData = filtered.map(toSafeAgent);
  agentsData = sortByMarchPerformance(agentsData);
  const partnerAgents = agentsData.filter((a) => isPartnerFn(a as SupabaseAgentRecord));
  return {
    user: null as unknown,
    agents: agentsData,
    updateDate,
    ranks,
    directRanks,
    partnerRanks,
    partnerAgents,
  };
}

