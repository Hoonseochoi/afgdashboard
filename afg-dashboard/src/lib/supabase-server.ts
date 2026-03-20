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
  /** 상품별 2주차 실적. PRIZE_SUM AH열 → product_week2. */
  productWeek2?: number | null;
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
  const raw1 =
    row?.product_week1 != null
      ? row.product_week1
      : row?.weekly?.productWeek1;
  const productWeek1 = safeNumber(raw1);
  const raw2 = row?.product_week2 != null ? row.product_week2 : row?.weekly?.productWeek2;
  const productWeek2 = safeNumber(raw2);
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

  let weekly = (row.weekly || null) as Record<string, number> | null;
  if (row.agent_weekly_week2 != null) {
    const w2 = safeNumber(row.agent_weekly_week2);
    if (w2 != null) {
      weekly = { ...(weekly || {}), week2: w2 };
    }
  }

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    password: row.password ?? undefined,
    role: row.role ?? undefined,
    performance: (row.performance || null) as Record<string, number> | null,
    weekly,
    productWeek1: productWeek1 ?? null,
    productWeek2: productWeek2 ?? null,
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

/** 로그인·페이지뷰(새로고침) 로그 기록. 실패해도 예외를 던지지 않음. */
export async function supabaseAuthActivityLogInsert(
  eventType: 'login' | 'page_view',
  payload: { userCode?: string; userName?: string; role?: string; userAgent?: string },
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const client = getServerClient();
    const { error } = await client.from('auth_activity_log').insert({
      event_type: eventType,
      user_code: payload.userCode ?? null,
      user_name: payload.userName ?? null,
      role: payload.role ?? null,
      user_agent: payload.userAgent ?? null,
    });
    if (error) console.error('auth_activity_log insert error:', error.message);
  } catch (e) {
    console.error('supabaseAuthActivityLogInsert:', e);
  }
}

/** 사용자별 로그인/페이지뷰 횟수 +1 (auth_access_counts). 실패해도 예외를 던지지 않음. */
export async function supabaseAuthAccessCountIncrement(
  eventType: 'login' | 'page_view',
  payload: { userCode: string; userName?: string },
): Promise<void> {
  if (!isSupabaseConfigured() || !payload.userCode?.trim()) return;
  try {
    const client = getServerClient();
    const code = String(payload.userCode).trim();
    const { data: existing } = await client
      .from('auth_access_counts')
      .select('login_count, page_view_count, user_name')
      .eq('user_code', code)
      .maybeSingle();

    if (existing) {
      const update =
        eventType === 'login'
          ? { login_count: (existing.login_count ?? 0) + 1, user_name: payload.userName ?? existing.user_name ?? null, updated_at: new Date().toISOString() }
          : { page_view_count: (existing.page_view_count ?? 0) + 1, user_name: payload.userName ?? existing.user_name ?? null, updated_at: new Date().toISOString() };
      const { error } = await client.from('auth_access_counts').update(update).eq('user_code', code);
      if (error) console.error('auth_access_counts update error:', error.message);
    } else {
      const { error } = await client.from('auth_access_counts').insert({
        user_code: code,
        user_name: payload.userName ?? null,
        login_count: eventType === 'login' ? 1 : 0,
        page_view_count: eventType === 'page_view' ? 1 : 0,
      });
      if (error) console.error('auth_access_counts insert error:', error.message);
    }
  } catch (e) {
    console.error('supabaseAuthAccessCountIncrement:', e);
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

// --- Admin 전용 (develope 계정): 공지사항, 프로필 이미지, 업로드 로그 ---

export type NoticeTargetAudience = "all" | "direct" | "partner" | string; // string = JSON array of codes

export type NoticeRecord = {
  id: string;
  title: string;
  body: string;
  enabled: boolean;
  target_audience: string;
  created_at: string;
  updated_at: string;
};

/** 활성 공지 1건 조회 (enabled=true, target_audience이 all 또는 주어진 target과 일치). 없으면 null */
export async function supabaseNoticeGetActive(
  target: "all" | "direct" | "partner" = "all"
): Promise<NoticeRecord | null> {
  try {
    const client = getServerClient();
    const { data, error } = await client
      .from("notices")
      .select("id, title, body, enabled, target_audience, created_at, updated_at")
      .eq("enabled", true)
      .order("updated_at", { ascending: false })
      .limit(10);
    if (error || !data?.length) return null;
    const row = data.find(
      (r: any) => r.target_audience === "all" || r.target_audience === target
    );
    if (!row) return null;
    return {
      id: row.id,
      title: row.title ?? "",
      body: row.body ?? "",
      enabled: !!row.enabled,
      target_audience: row.target_audience ?? "all",
      created_at: row.created_at ?? "",
      updated_at: row.updated_at ?? "",
    };
  } catch {
    return null;
  }
}

/** notices 테이블 전체 조회 (admin) */
export async function supabaseNoticesList(): Promise<NoticeRecord[]> {
  const client = getServerClient();
  const { data, error } = await client
    .from("notices")
    .select("id, title, body, enabled, target_audience, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("supabaseNoticesList error:", error.message);
    throw error;
  }
  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title ?? "",
    body: r.body ?? "",
    enabled: !!r.enabled,
    target_audience: r.target_audience ?? "all",
    created_at: r.created_at ?? "",
    updated_at: r.updated_at ?? "",
  }));
}

/** 공지 1건 생성 */
export async function supabaseNoticeInsert(row: {
  title: string;
  body: string;
  enabled?: boolean;
  target_audience?: string;
}): Promise<NoticeRecord> {
  const client = getServerClient();
  const { data, error } = await client
    .from("notices")
    .insert({
      title: row.title,
      body: row.body,
      enabled: row.enabled ?? true,
      target_audience: row.target_audience ?? "all",
    })
    .select("id, title, body, enabled, target_audience, created_at, updated_at")
    .single();
  if (error) {
    console.error("supabaseNoticeInsert error:", error.message);
    throw error;
  }
  return {
    id: data.id,
    title: data.title ?? "",
    body: data.body ?? "",
    enabled: !!data.enabled,
    target_audience: data.target_audience ?? "all",
    created_at: data.created_at ?? "",
    updated_at: data.updated_at ?? "",
  };
}

/** 공지 1건 수정 (enabled, target_audience, title, body) */
export async function supabaseNoticeUpdate(
  id: string,
  patch: { title?: string; body?: string; enabled?: boolean; target_audience?: string }
): Promise<void> {
  const client = getServerClient();
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.body !== undefined) payload.body = patch.body;
  if (patch.enabled !== undefined) payload.enabled = patch.enabled;
  if (patch.target_audience !== undefined) payload.target_audience = patch.target_audience;
  if (Object.keys(payload).length === 0) return;
  const { error } = await client.from("notices").update(payload).eq("id", id);
  if (error) {
    console.error("supabaseNoticeUpdate error:", error.message);
    throw error;
  }
}

/** agent_profile_images: 설계사별 프로필 이미지 URL 조회 (전체) */
export async function supabaseAgentProfileImagesGetAll(): Promise<Record<string, string>> {
  const client = getServerClient();
  const { data, error } = await client
    .from("agent_profile_images")
    .select("agent_code, image_url");
  if (error) {
    console.error("supabaseAgentProfileImagesGetAll error:", error.message);
    throw error;
  }
  const map: Record<string, string> = {};
  for (const row of data || []) {
    if (row.agent_code && row.image_url) map[row.agent_code] = row.image_url;
  }
  return map;
}

/** agent_profile_images: 한 명 이미지 설정(upsert) */
export async function supabaseAgentProfileImageUpsert(
  agentCode: string,
  imageUrl: string
): Promise<void> {
  const client = getServerClient();
  const { error } = await client
    .from("agent_profile_images")
    .upsert(
      { agent_code: agentCode.trim(), image_url: imageUrl, updated_at: new Date().toISOString() },
      { onConflict: "agent_code" }
    );
  if (error) {
    console.error("supabaseAgentProfileImageUpsert error:", error.message);
    throw error;
  }
}

/** config 전체 행 조회 (admin용 - 업데이트 이력 등) */
export async function supabaseConfigGetAll(): Promise<{ key: string; update_date?: string; [k: string]: unknown }[]> {
  const client = getServerClient();
  const { data, error } = await client.from("config").select("*");
  if (error) {
    console.error("supabaseConfigGetAll error:", error.message);
    throw error;
  }
  return data || [];
}

/** upload_log 테이블이 있으면 최근 N건 조회 */
export async function supabaseUploadLogList(limit = 100): Promise<Record<string, unknown>[]> {
  try {
    const client = getServerClient();
    const { data, error } = await client
      .from("upload_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/** upload_history 테이블이 있으면 최근 N건 조회 */
export async function supabaseUploadHistoryList(limit = 100): Promise<Record<string, unknown>[]> {
  try {
    const client = getServerClient();
    const { data, error } = await client
      .from("upload_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

// --- Push Notifications (pg 직접 연결 — PostgREST 스키마 캐시 우회) ---

import { Pool } from "pg";

function getPgPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL 환경변수가 없습니다.");
  return new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 3 });
}

export type PushSubscriptionRecord = {
  id: string;
  user_code: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  created_at: string;
};

/** push_subscriptions: 구독 저장 (upsert by endpoint) */
export async function supabasePushSubscriptionUpsert(
  userCode: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
  const pool = getPgPool();
  try {
    await pool.query(
      `INSERT INTO public.push_subscriptions (user_code, endpoint, p256dh, auth_key, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (endpoint) DO UPDATE
         SET user_code = EXCLUDED.user_code,
             p256dh    = EXCLUDED.p256dh,
             auth_key  = EXCLUDED.auth_key,
             updated_at = now()`,
      [userCode, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
    );
  } finally {
    await pool.end();
  }
}

/** push_subscriptions: endpoint로 구독 삭제 */
export async function supabasePushSubscriptionDelete(endpoint: string): Promise<void> {
  const pool = getPgPool();
  try {
    await pool.query(
      `DELETE FROM public.push_subscriptions WHERE endpoint = $1`,
      [endpoint]
    );
  } finally {
    await pool.end();
  }
}

/** push_subscriptions: 전체 구독 목록 조회 (push 발송용) */
export async function supabasePushSubscriptionsGetAll(): Promise<PushSubscriptionRecord[]> {
  const pool = getPgPool();
  try {
    const result = await pool.query(
      `SELECT id, user_code, endpoint, p256dh, auth_key, created_at
       FROM public.push_subscriptions`
    );
    return result.rows;
  } finally {
    await pool.end();
  }
}

