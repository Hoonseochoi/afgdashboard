import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 서버 전용 클라이언트
 * - API 라우트 / Node 스크립트에서만 사용 (Service Role Key 필요)
 * - 환경 변수는 매 요청 시점에 읽음 (배포 시 빌드 타임 인라인 방지)
 *   - SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

function getEnv() {
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { url, key };
}

function getServerClient(): SupabaseClient {
  const { url, key } = getEnv();
  if (!url || !key) {
    throw new Error("Supabase 환경변수가 설정되어 있지 않습니다.");
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getEnv();
  return !!url && !!key;
}

/** 파트너 시상 데이터 (기존 Appwrite와 동일 타입 호환) */
export type PartnerPrizeData = {
  productWeek1?: number;
  productWeek1InsPrize?: number;
  productWeek1Prize?: number;
  productWeek2?: number;
  productWeek2InsPrize?: number;
  productWeek2Prize?: number;
  week3Prize?: number;
  week34Sum?: number;
  week34Prize?: number;
  continuous12Jan?: number;
  continuous12Feb?: number;
  continuous12Prize?: number;
  continuous12ExtraJan?: number;
  continuous12ExtraFeb?: number;
  continuous12ExtraPrize?: number;
  continuous23Feb?: number;
  continuous23Mar?: number;
  continuous23Prize?: number;
  continuous23ExtraFeb?: number;
  continuous23ExtraMar?: number;
  continuous23ExtraPrize?: number;
  continuous121Dec?: number;
  continuous121Jan?: number;
  continuous121Prize?: number;
  productWeek1PrizeJan?: number;
  productWeek2PrizeJan?: number;
  productWeek2InsJan?: number;
  week3PrizeJan?: number;
  week4Jan?: number;
  week4PrizeJan?: number;
};

export type SupabaseAgentRecord = {
  id: string;
  code: string;
  name: string;
  password?: string | null;
  role?: string | null;
  performance?: Record<string, number> | null;
  weekly?: Record<string, number> | null;
  /** 상품별(통합·간편·어린이) 1주차 실적. 1주차 전체 실적은 weekly.week1 사용. */
  productWeek1?: number | null;
  partner?: PartnerPrizeData | null;
  managerCode?: string | null;
  managerName?: string | null;
  branch?: string | null;
  gaBranch?: string | null;
  /** MC LIST AH열: 지점/대리점명 (예: GA4-7, GA4-7지점, 충청GA-5) */
  m_agent?: string | null;
  isFirstLogin?: boolean | null;
  targetManagerCode?: string | null;
};

function safeNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'bigint' ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function rowToAgent(row: any): SupabaseAgentRecord {
  const raw =
    row?.product_week1 != null
      ? row.product_week1
      : row?.weekly?.productWeek1;
  const productWeek1 = safeNumber(raw);
  let partner: PartnerPrizeData | null = null;
  if (row.partner != null) {
    if (typeof row.partner === 'string') {
      try {
        partner = JSON.parse(row.partner) as PartnerPrizeData;
      } catch {
        partner = null;
      }
    } else if (typeof row.partner === 'object') {
      partner = row.partner as PartnerPrizeData;
    }
  }

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    password: row.password ?? undefined,
    role: row.role ?? undefined,
    performance: (row.performance || null) as Record<string, number> | null,
    weekly: (row.weekly || null) as Record<string, number> | null,
    productWeek1: productWeek1 ?? null,
    partner,
    managerCode: row.manager_code ?? null,
    managerName: row.manager_name ?? null,
    branch: row.branch ?? null,
    gaBranch: row.ga_branch ?? null,
    m_agent: row.m_agent ?? null,
    isFirstLogin: row.is_first_login ?? null,
    targetManagerCode: row.target_manager_code ?? null,
  };
}

/** code로 설계사 1건 조회 */
export async function supabaseAgentGetByCode(
  code: string,
): Promise<SupabaseAgentRecord | null> {
  const client = getServerClient();
  const trimmed = String(code).trim();
  if (!trimmed) return null;
  const { data, error } = await client
    .from("agents")
    .select("*")
    .eq("code", trimmed)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("supabaseAgentGetByCode error:", error.message);
    throw error;
  }
  if (!data) return null;
  return rowToAgent(data);
}

const AGENTS_PAGE_SIZE = 1000;
const AGENTS_MAX_PAGES = 10;

/** 필터로 설계사 목록 조회 (전체 수집). PostgREST 1000행 제한이 있어 페이지네이션으로 전부 수집 */
export async function supabaseAgentsListAll(params: {
  filterRole?: string;
  filterManagerCode?: string;
}): Promise<SupabaseAgentRecord[]> {
  const client = getServerClient();
  const all: SupabaseAgentRecord[] = [];
  for (let page = 0; page < AGENTS_MAX_PAGES; page++) {
    const from = page * AGENTS_PAGE_SIZE;
    const to = from + AGENTS_PAGE_SIZE - 1;
    let query = client.from("agents").select("*").range(from, to);
    if (params.filterRole) {
      query = query.eq("role", params.filterRole);
    }
    if (params.filterManagerCode) {
      query = query.eq("manager_code", params.filterManagerCode);
    }
    const { data, error } = await query;
    if (error) {
      console.error("supabaseAgentsListAll error:", error.message);
      throw error;
    }
    const chunk = (data || []).map(rowToAgent);
    all.push(...chunk);
    if (chunk.length < AGENTS_PAGE_SIZE) break;
  }
  return all;
}

/** m_agent 값으로 해당 지점 소속 설계사 목록 조회 (값 또는 값+지점 둘 다 매칭) */
export async function supabaseAgentsByMAgent(mAgentValue: string): Promise<SupabaseAgentRecord[]> {
  const client = getServerClient();
  const normalized = String(mAgentValue).trim().replace(/지점$/, '');
  const values = [normalized, normalized + '지점'].filter((v, i, arr) => arr.indexOf(v) === i);
  const all: SupabaseAgentRecord[] = [];
  for (let page = 0; page < AGENTS_MAX_PAGES; page++) {
    const from = page * AGENTS_PAGE_SIZE;
    const to = from + AGENTS_PAGE_SIZE - 1;
    const { data, error } = await client
      .from('agents')
      .select('*')
      .in('m_agent', values)
      .range(from, to);
    if (error) {
      console.error('supabaseAgentsByMAgent error:', error.message);
      throw error;
    }
    const chunk = (data || []).map((row: any) => rowToAgent(row));
    all.push(...chunk);
    if (chunk.length < AGENTS_PAGE_SIZE) break;
  }
  return all;
}

/** m_agent 로그인 비밀번호 조회 */
export async function supabaseMAgentLoginGet(mAgentValue: string): Promise<{ password: string } | null> {
  const client = getServerClient();
  const normalized = String(mAgentValue).trim().replace(/지점$/, '');
  const { data, error } = await client
    .from('m_agent_logins')
    .select('password')
    .eq('m_agent_value', normalized)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('supabaseMAgentLoginGet error:', error.message);
    throw error;
  }
  return data ? { password: data.password } : null;
}

/** m_agent 로그인 비밀번호 저장/수정 (비밀번호 변경 시 사용) */
export async function supabaseMAgentLoginUpsert(
  mAgentValue: string,
  password: string,
): Promise<void> {
  const client = getServerClient();
  const normalized = String(mAgentValue).trim().replace(/지점$/, '');
  const { error } = await client.from('m_agent_logins').upsert(
    { m_agent_value: normalized, password },
    { onConflict: 'm_agent_value' },
  );
  if (error) {
    console.error('supabaseMAgentLoginUpsert error:', error.message);
    throw error;
  }
}

/** config 테이블에서 key='app' 행 1건 조회 */
export async function supabaseConfigGetApp(): Promise<{
  updateDate?: string;
} | null> {
  const client = getServerClient();
  const { data, error } = await client
    .from("config")
    .select("key, update_date")
    .eq("key", "app")
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("supabaseConfigGetApp error:", error.message);
    throw error;
  }
  if (!data) return null;
  return { updateDate: data.update_date ?? undefined };
}

/** 설계사 비밀번호 / isFirstLogin 수정 (change-password 전용) */
export async function supabaseAgentUpdate(
  code: string,
  data: { password?: string; isFirstLogin?: boolean },
): Promise<void> {
  const client = getServerClient();
  const patch: Record<string, unknown> = {};
  if (data.password !== undefined) patch.password = data.password;
  if (data.isFirstLogin !== undefined) patch.is_first_login = data.isFirstLogin;
  if (Object.keys(patch).length === 0) return;

  const { error } = await client
    .from("agents")
    .update(patch)
    .eq("code", code);
  if (error) {
    console.error("supabaseAgentUpdate error:", error.message);
    throw error;
  }
}

