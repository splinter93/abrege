import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const resRid = req.headers.get('x-request-id') ?? crypto.randomUUID();

  // Public paths to allow without auth check (home, public notes, assets)
  const PUBLIC_PREFIXES = ['/_next', '/favicon', '/public', '/@', '/api/v1/public'];

  if (PUBLIC_PREFIXES.some(p => url.pathname.startsWith(p))) {
    const res = NextResponse.next();
    res.headers.set('x-request-id', resRid);
    return res;
  }

  // Allow /private/**; client-side AuthProvider will enforce auth UI
  // if (url.pathname.startsWith('/private')) {
  //   const isAuthed = req.headers.get('authorization') || req.cookies.get('sb-access-token');
  //   if (!isAuthed) return NextResponse.redirect(new URL('/', req.url));
  // }

  // Propagate x-request-id to downstream (API/app router)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', resRid);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('x-request-id', resRid);
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}; 