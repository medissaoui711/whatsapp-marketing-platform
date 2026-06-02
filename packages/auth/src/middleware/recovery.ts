import { NextRequest, NextResponse } from 'next/server';

export function recoveryMiddleware() {
  return async (
    request: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> => {
    try {
      return await handler();
    } catch (error) {
      console.error('Unhandled error:', error);

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}


