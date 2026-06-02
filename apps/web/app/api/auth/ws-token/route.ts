import { NextRequest, NextResponse } from 'next/server';
import { withAuth, generateWSToken } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const token = generateWSToken(context.userId, context.tenantId);
  return NextResponse.json({ token });
});


