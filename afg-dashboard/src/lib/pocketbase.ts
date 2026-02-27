/**
 * PocketBase 서버 연결 (REST API)
 * - 서버(API 라우트)에서만 사용. 환경 변수 POCKETBASE_URL 필요.
 * @see https://pocketbase.io/docs/api-records/
 */

const DEFAULT_URL = "http://127.0.0.1:8090";

export function getPocketBaseUrl(): string {
  return process.env.POCKETBASE_URL ?? DEFAULT_URL;
}

export function pbApi(path: string, options: RequestInit = {}): Promise<Response> {
  const base = getPocketBaseUrl().replace(/\/$/, "");
  const url = path.startsWith("/") ? `${base}${path}` : `${base}/api/${path}`;
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

/** Admin 토큰으로 API 호출 (agents 등 보호된 컬렉션용) */
export function pbApiWithAuth(path: string, token: string, options: RequestInit = {}): Promise<Response> {
  const base = getPocketBaseUrl().replace(/\/$/, "");
  const url = path.startsWith("/") ? `${base}${path}` : `${base}/api/${path}`;
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      ...options.headers,
    },
  });
}

/** Admin 로그인 → 토큰 반환 (POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD 필요) */
export async function pbAdminAuth(): Promise<string> {
  const email = process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.POCKETBASE_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD are required for admin API");
  }
  // v0.23+ 에서는 /api/admins/* 제거 → _superusers 컬렉션 인증 사용
  const res = await pbApi("/api/collections/_superusers/auth-with-password", {
    method: "POST",
    body: JSON.stringify({ identity: email, password }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PocketBase admin auth failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error("PocketBase admin auth: no token in response");
  return data.token;
}

/** code로 agents 컬렉션에서 1건 조회 (Admin API 사용) */
export async function pbAgentGetByCode(code: string): Promise<PbAgentRecord | null> {
  const token = await pbAdminAuth();
  const safe = String(code).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const filter = `(code = "${safe}")`;
  const res = await pbApiWithAuth(
    `/api/collections/agents/records?filter=${encodeURIComponent(filter)}&perPage=1`,
    token
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { items?: PbAgentRecord[] };
  const items = data.items ?? [];
  return items.length > 0 ? items[0] : null;
}

export type PbAgentRecord = {
  id: string;
  code: string;
  name: string;
  branch?: string;
  password?: string;
  performance?: Record<string, number>;
  weekly?: Record<string, number>;
  managerCode?: string;
  managerName?: string;
  role?: string;
  isFirstLogin?: boolean;
  targetManagerCode?: string | null;
};

/** 컬렉션 레코드 목록 조회 (필터/정렬 가능) */
export async function pbCollectionGet<T = unknown>(
  collection: string,
  params?: { page?: number; perPage?: number; filter?: string; sort?: string }
): Promise<{ items: T[]; totalItems: number }> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.perPage != null) search.set("perPage", String(params.perPage));
  if (params?.filter) search.set("filter", params.filter);
  if (params?.sort) search.set("sort", params.sort);
  const qs = search.toString();
  const path = `/api/collections/${collection}/records${qs ? `?${qs}` : ""}`;
  const res = await pbApi(path);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PocketBase ${collection} get failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { items: T[]; totalItems: number };
  return { items: data.items ?? [], totalItems: data.totalItems ?? 0 };
}

/** Admin 토큰으로 컬렉션 목록 조회 (agents/config 등) */
export async function pbCollectionGetWithAuth<T = unknown>(
  collection: string,
  token: string,
  params?: { page?: number; perPage?: number; filter?: string; sort?: string }
): Promise<{ items: T[]; totalItems: number }> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.perPage != null) search.set("perPage", String(params.perPage));
  if (params?.filter) search.set("filter", params.filter);
  if (params?.sort) search.set("sort", params.sort);
  const qs = search.toString();
  const path = `/api/collections/${collection}/records${qs ? `?${qs}` : ""}`;
  const res = await pbApiWithAuth(path, token);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PocketBase ${collection} get failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { items: T[]; totalItems: number };
  return { items: data.items ?? [], totalItems: data.totalItems ?? 0 };
}

const PB_PER_PAGE_MAX = 500;

/** Admin 토큰으로 컬렉션 전체 목록 조회 (페이지네이션 자동, perPage 제한 대응) */
export async function pbCollectionGetAllWithAuth<T = unknown>(
  collection: string,
  token: string,
  params: { filter?: string; sort?: string }
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  while (true) {
    const { items, totalItems } = await pbCollectionGetWithAuth<T>(collection, token, {
      ...params,
      page,
      perPage: PB_PER_PAGE_MAX,
    });
    all.push(...items);
    if (items.length < PB_PER_PAGE_MAX || all.length >= totalItems) break;
    page++;
  }
  return all;
}

/** Admin 토큰으로 레코드 수정 (agents 비밀번호 등) */
export async function pbRecordUpdateWithAuth<T = unknown>(
  collection: string,
  id: string,
  token: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await pbApiWithAuth(`/api/collections/${collection}/records/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PocketBase ${collection} update failed: ${res.status} ${err}`);
  }
  return (await res.json()) as T;
}

/** config 컬렉션에서 key="app" 레코드 1건 조회 (updateDate 등) */
export async function pbConfigGetApp(token: string): Promise<{ updateDate?: string } | null> {
  const { items } = await pbCollectionGetWithAuth<{ updateDate?: string }>("config", token, {
    filter: '(key = "app")',
    perPage: 1,
  });
  return items.length > 0 ? items[0] : null;
}

/** 컬렉션 단일 레코드 조회 (id) */
export async function pbRecordGet<T = unknown>(collection: string, id: string): Promise<T | null> {
  const res = await pbApi(`/api/collections/${collection}/records/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PocketBase ${collection} getOne failed: ${res.status} ${err}`);
  }
  return (await res.json()) as T;
}

/** 컬렉션 레코드 생성 */
export async function pbRecordCreate<T = unknown>(collection: string, body: Record<string, unknown>): Promise<T> {
  const res = await pbApi(`/api/collections/${collection}/records`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PocketBase ${collection} create failed: ${res.status} ${err}`);
  }
  return (await res.json()) as T;
}

/** 컬렉션 레코드 수정 */
export async function pbRecordUpdate<T = unknown>(
  collection: string,
  id: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await pbApi(`/api/collections/${collection}/records/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PocketBase ${collection} update failed: ${res.status} ${err}`);
  }
  return (await res.json()) as T;
}

/** PocketBase 서버 연결 확인 (헬스 체크) @see https://pocketbase.io/docs/api-health */
export async function pbHealthCheck(): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await pbApi("/api/health");
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { status?: number; code?: number; message?: string };
    const ok = data?.status === 200 || data?.code === 200;
    return { ok, message: data?.message ?? "API is healthy." };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
