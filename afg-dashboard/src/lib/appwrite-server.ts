/**
 * Appwrite 서버 전용 (API 키로 DB 접근)
 * - API 라우트에서만 사용. 환경 변수: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY,
 *   APPWRITE_DATABASE_ID, APPWRITE_AGENTS_COLLECTION_ID, APPWRITE_CONFIG_COLLECTION_ID
 */

import { Client, Databases, Query } from 'node-appwrite';

const DEFAULT_ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const DEFAULT_PROJECT = '69a11879001bc4449874';

function getServerClient(): Client {
  const endpoint = process.env.APPWRITE_ENDPOINT ?? DEFAULT_ENDPOINT;
  const project = process.env.APPWRITE_PROJECT_ID ?? DEFAULT_PROJECT;
  const key = process.env.APPWRITE_API_KEY;
  const client = new Client().setEndpoint(endpoint).setProject(project);
  if (key) client.setKey(key);
  return client;
}

function getDb(): Databases {
  return new Databases(getServerClient());
}

function getDatabaseId(): string {
  const id = process.env.APPWRITE_DATABASE_ID;
  if (!id) throw new Error('APPWRITE_DATABASE_ID is required');
  return id;
}

function getAgentsCollectionId(): string {
  const id = process.env.APPWRITE_AGENTS_COLLECTION_ID;
  if (!id) throw new Error('APPWRITE_AGENTS_COLLECTION_ID is required');
  return id;
}

function getConfigCollectionId(): string {
  const id = process.env.APPWRITE_CONFIG_COLLECTION_ID;
  if (!id) throw new Error('APPWRITE_CONFIG_COLLECTION_ID is required');
  return id;
}

/** Appwrite 문서에서 읽는 Agent 필드 (performance, weekly는 JSON 문자열로 저장 가정) */
type AgentDocFields = {
  $id: string;
  code: string;
  name: string;
  password?: string;
  role?: string;
  performance?: string;
  weekly?: string;
  managerCode?: string;
  managerName?: string;
  branch?: string;
  isFirstLogin?: boolean;
  targetManagerCode?: string | null;
};

export type AppwriteAgentRecord = {
  id: string;
  code: string;
  name: string;
  password?: string;
  role?: string;
  performance?: Record<string, number>;
  weekly?: Record<string, number>;
  managerCode?: string;
  managerName?: string;
  branch?: string;
  isFirstLogin?: boolean;
  targetManagerCode?: string | null;
};

function docToRecord(doc: AgentDocFields): AppwriteAgentRecord {
  const performance =
    typeof doc.performance === 'string' && doc.performance
      ? (JSON.parse(doc.performance) as Record<string, number>)
      : undefined;
  const weekly =
    typeof doc.weekly === 'string' && doc.weekly ? (JSON.parse(doc.weekly) as Record<string, number>) : undefined;
  return {
    id: doc.$id,
    code: doc.code,
    name: doc.name,
    password: doc.password,
    role: doc.role,
    performance,
    weekly,
    managerCode: doc.managerCode,
    managerName: doc.managerName,
    branch: doc.branch,
    isFirstLogin: doc.isFirstLogin,
    targetManagerCode: doc.targetManagerCode ?? undefined,
  };
}

const LIST_PAGE_SIZE = 500;

/** code로 설계사 1건 조회 */
export async function appwriteAgentGetByCode(code: string): Promise<AppwriteAgentRecord | null> {
  const db = getDb();
  const databaseId = getDatabaseId();
  const collectionId = getAgentsCollectionId();
  const safe = String(code).trim();
  if (!safe) return null;
  const res = await db.listDocuments(databaseId, collectionId, [
    Query.equal('code', [safe]),
    Query.limit(1),
  ]);
  const list = (res.documents ?? []) as unknown as AgentDocFields[];
  return list.length > 0 ? docToRecord(list[0]) : null;
}

/** 필터로 설계사 목록 조회 (페이지네이션으로 전체 수집) */
export async function appwriteAgentsListAll(params: {
  filterRole?: string;
  filterManagerCode?: string;
}): Promise<AppwriteAgentRecord[]> {
  const db = getDb();
  const databaseId = getDatabaseId();
  const collectionId = getAgentsCollectionId();
  const queries: string[] = [];
  if (params.filterRole) queries.push(Query.equal('role', [params.filterRole]));
  if (params.filterManagerCode) queries.push(Query.equal('managerCode', [params.filterManagerCode]));
  queries.push(Query.limit(LIST_PAGE_SIZE));

  const all: AppwriteAgentRecord[] = [];
  let offset = 0;
  while (true) {
    const q = [...queries.slice(0, -1), Query.limit(LIST_PAGE_SIZE), Query.offset(offset)];
    const res = await db.listDocuments(databaseId, collectionId, q);
    const docs = (res.documents ?? []) as unknown as AgentDocFields[];
    all.push(...docs.map(docToRecord));
    if (docs.length < LIST_PAGE_SIZE) break;
    offset += LIST_PAGE_SIZE;
  }
  return all;
}

/** config 컬렉션에서 key="app" 문서 1건 조회 (updateDate 등) */
export async function appwriteConfigGetApp(): Promise<{ updateDate?: string } | null> {
  const db = getDb();
  const databaseId = getDatabaseId();
  const collectionId = getConfigCollectionId();
  const res = await db.listDocuments(databaseId, collectionId, [
    Query.equal('key', ['app']),
    Query.limit(1),
  ]);
  const list = (res.documents ?? []) as unknown as { updateDate?: string }[];
  return list.length > 0 ? list[0] : null;
}

/** 설계사 문서 일부 필드 수정 (비밀번호, isFirstLogin 등) */
export async function appwriteAgentUpdate(
  documentId: string,
  data: { password?: string; isFirstLogin?: boolean }
): Promise<void> {
  const db = getDb();
  const databaseId = getDatabaseId();
  const collectionId = getAgentsCollectionId();
  const body: Record<string, unknown> = {};
  if (data.password !== undefined) body.password = data.password;
  if (data.isFirstLogin !== undefined) body.isFirstLogin = data.isFirstLogin;
  await db.updateDocument(databaseId, collectionId, documentId, body);
}

/** 서버용 Appwrite 설정이 모두 있는지 */
export function isAppwriteConfigured(): boolean {
  return !!(
    process.env.APPWRITE_API_KEY &&
    process.env.APPWRITE_DATABASE_ID &&
    process.env.APPWRITE_AGENTS_COLLECTION_ID &&
    process.env.APPWRITE_CONFIG_COLLECTION_ID
  );
}
