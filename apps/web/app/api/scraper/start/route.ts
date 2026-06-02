import { NextRequest, NextResponse } from 'next/server';

const WS_SERVER = process.env.WS_SERVER_URL || 'http://localhost:3001';

async function publishEvent(event: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${WS_SERVER}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch {
    // WS server may not be running
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platform, type, target, tenantId = 'demo' } = body;

    console.log(`Scraping request: ${platform}/${type}/${target} for tenant ${tenantId}`);

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    publishEvent({
      type: 'SCRAPE_STARTED',
      jobId,
      tenantId,
      data: { platform, type, target },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      jobId,
      platform,
      type,
      target,
      message: `تم بدء استخراج بيانات ${platform} للمستخدم ${target}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
