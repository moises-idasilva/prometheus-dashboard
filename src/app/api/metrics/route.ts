import { NextRequest, NextResponse } from 'next/server';
import { getApiConfig, isValidApiId } from '@/lib/apiConfig';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const apiId = request.nextUrl.searchParams.get('apiId');

  if (!apiId || !isValidApiId(apiId)) {
    return NextResponse.json({ error: 'Invalid or missing apiId' }, { status: 400 });
  }

  const api = getApiConfig(apiId)!;
  const token = process.env[api.tokenEnvKey];

  if (!token) {
    return NextResponse.json(
      { error: `Token env var ${api.tokenEnvKey} is not configured` },
      { status: 500 }
    );
  }

  try {
    const upstream = await fetch(api.url, {
      headers: {
        Authorization: token,
        Accept: 'text/plain;version=0.0.4,*/*',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream responded ${upstream.status} ${upstream.statusText}` },
        { status: upstream.status }
      );
    }

    const text = await upstream.text();

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream fetch failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
