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
  partner?: any;
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
