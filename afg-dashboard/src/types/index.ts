export interface PerformanceData {
  [key: string]: number;
}

export interface WeeklyPerformance {
  week: number;
  performance: number;
}

export interface Agent {
  code: string;
  name: string;
  branch: string;
  /** 매니저명 (상단 타이틀 브랜치 옆 표시용) */
  managerName?: string | null;
  performance: PerformanceData;
  weekly_data?: WeeklyPerformance[];
  /** Supabase agents.product_week1 — 상품별 1주차 실적 (파트너 주간 시상용) */
  productWeek1?: number | null;
  /** 파트너 시상 데이터 (PRIZE_SUM 업로드: 연속가동·주차 시상금 등) */
  partner?: Record<string, number | undefined> | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  isFirstLogin: boolean;
  role?: string;
  code?: string;
}

export type DashboardMode = "direct" | "partner" | "all";
export type ViewMonth = 1 | 2 | 3;
