import { NextResponse } from 'next/server';
import {
  supabaseAgentGetByCode,
  supabaseAgentsByMAgent,
  supabaseMAgentLoginGet,
  supabaseAuthActivityLogInsert,
  isSupabaseConfigured,
} from '@/lib/supabase-server';

const DEV_MASTER_ID = 'develope';
const DEV_MASTER_PW = 'develope';

/** 지점 ID 정규화: 뒤 "지점" 제외 (예: 충청GA-5지점 → 충청GA-5) */
function normalizeMAgentId(id: string): string {
  return String(id).trim().replace(/지점$/, '');
}

/** 사번(숫자 코드)으로 보이는지 여부 */
function isDesigneeCode(code: string): boolean {
  return /^\d+$/.test(String(code).trim());
}

export async function POST(request: Request) {
  try {
    const { code, password } = await request.json();

    if (!code || !password) {
      return NextResponse.json({ error: '사번과 비밀번호를 입력해주세요.' }, { status: 400 });
    }

    if (code === DEV_MASTER_ID && password === DEV_MASTER_PW) {
      const userPayload = {
        code: DEV_MASTER_ID,
        name: '개발자',
        isFirstLogin: false,
        role: 'admin',
        targetManagerCode: null,
        branch: null,
      };
      await supabaseAuthActivityLogInsert('login', {
        userCode: userPayload.code,
        userName: userPayload.name,
        role: userPayload.role,
        userAgent: request.headers.get('user-agent') ?? undefined,
      });
      const response = NextResponse.json({ success: true, user: userPayload });
      response.cookies.set('auth_session', JSON.stringify(userPayload), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: '서버 설정 오류: Supabase가 설정되지 않았습니다. 관리자에게 문의하세요.' },
        { status: 500 }
      );
    }

    // m_agent(지점 ID) 로그인: ID가 숫자만이 아닐 때 (예: GA4-7, 충청GA-5)
    if (!isDesigneeCode(code)) {
      const normalizedId = normalizeMAgentId(code);
      const agents = await supabaseAgentsByMAgent(normalizedId);
      if (agents.length === 0) {
        return NextResponse.json(
          { error: '존재하지 않는 지점(대리점) ID입니다.' },
          { status: 401 }
        );
      }
      const stored = await supabaseMAgentLoginGet(normalizedId);
      const expectedPassword = stored ? stored.password : normalizedId; // 초기 비밀번호 = ID(지점 제외)
      if (password !== expectedPassword) {
        return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
      }
      // m_agent_logins에 저장된 비밀번호가 없으면 첫 로그인(초기 비밀번호 사용 중) → 비밀번호 변경 유도
      const isFirstLogin = !stored;
      const user = {
        code: normalizedId,
        name: normalizedId + ' 지점',
        isFirstLogin,
        role: 'm_agent_manager' as const,
        targetManagerCode: null,
        branch: null,
        m_agentValue: normalizedId,
      };
      await supabaseAuthActivityLogInsert('login', {
        userCode: user.code,
        userName: user.name,
        role: user.role,
        userAgent: request.headers.get('user-agent') ?? undefined,
      });
      const response = NextResponse.json({ success: true, user });
      response.cookies.set('auth_session', JSON.stringify(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    const agent = await supabaseAgentGetByCode(String(code));
    if (!agent) {
      return NextResponse.json({ error: '존재하지 않는 사번입니다.' }, { status: 401 });
    }
    if (agent.password !== password) {
      return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    const isBranchManagerCode =
      String(agent.code) === '105203241' || String(agent.code) === '722031500';
    const user = {
      code: agent.code,
      name: agent.name,
      isFirstLogin: agent.isFirstLogin ?? true,
      role: isBranchManagerCode ? 'manager' : agent.role || 'agent',
      targetManagerCode: agent.targetManagerCode ?? null,
      branch: agent.branch ?? null,
    };
    await supabaseAuthActivityLogInsert('login', {
      userCode: user.code,
      userName: user.name,
      role: user.role,
      userAgent: request.headers.get('user-agent') ?? undefined,
    });
    const response = NextResponse.json({ success: true, user });
    response.cookies.set('auth_session', JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Login error:', message);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
