/**
 * 지점명 표시 (스튜디오/지사명 전용):
 * - "주식회사 어센틱금융그룹" 문구 제거
 * - "(엔타스3스튜디오)"처럼 괄호 안에 스튜디오명이 있으면 그 안의 텍스트만 표시
 */
export function branchDisplayLabel(branch: string | null | undefined): string {
  let b = String(branch ?? "").trim();
  if (!b) return "";

  b = b.replace("주식회사 어센틱금융그룹", "").trim();

  const parenMatch = b.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    return parenMatch[1].trim();
  }

  if (b.startsWith("(") && b.endsWith(")")) {
    b = b.slice(1, -1).trim();
  }

  return b || String(branch ?? "").trim();
}

/**
 * 화면 표시용 지점명:
 * - agent.gaBranch 가 "우리"/"WOORI"를 포함하면 → "WOORI BRANCH"
 * - 그 외에는 branchDisplayLabel로 가공
 */
export function displayBranch(agent: { branch?: string | null; gaBranch?: string | null }): string {
  const ga = String((agent as any).gaBranch ?? "").trim();
  if (ga && (ga.includes("우리") || ga.toUpperCase().includes("WOORI"))) {
    return "WOORI BRANCH";
  }
  return branchDisplayLabel(agent.branch ?? null);
}

/** 금액 표시: 원 단위를 '만원' 기준 소수 첫째 자리(천원 단위)까지, 반올림 없이 표시 */
export function formatMan(amount: number | null | undefined): string {
  const v = typeof amount === "number" ? amount : Number(amount ?? 0);
  if (!Number.isFinite(v) || v === 0) return "0";
  const manTimes10 = Math.floor((v / 10000) * 10);
  const man = manTimes10 / 10;
  const hasDecimal = manTimes10 % 10 !== 0;
  return man.toLocaleString(undefined, hasDecimal ? { minimumFractionDigits: 1, maximumFractionDigits: 1 } : { maximumFractionDigits: 0 });
}
