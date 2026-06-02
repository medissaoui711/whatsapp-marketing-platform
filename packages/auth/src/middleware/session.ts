import { NextRequest, NextResponse } from 'next/server';
import { getSession, isSessionIdle, deleteSession } from '../session';

export async function sessionMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const sessionId = request.cookies.get('whm_session')?.value;

  if (!sessionId) return null;

  const session = await getSession(sessionId);

  if (!session) {
    const response = NextResponse.next();
    response.cookies.set('whm_session', '', { maxAge: 0, path: '/' });
    return response;
  }

  if (isSessionIdle(session)) {
    await deleteSession(sessionId);
    const response = NextResponse.next();
    response.cookies.set('whm_session', '', { maxAge: 0, path: '/' });
    return response;
  }

  const response = NextResponse.next();
  response.headers.set('X-Session-ID', session.id);
  response.headers.set('X-User-ID', session.userId);
  response.headers.set('X-Tenant-ID', session.tenantId);

  return response;
}


