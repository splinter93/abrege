import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const resRid = req.headers.get('x-request-id') ?? crypto.randomUUID();

  // Public paths to allow without auth check (home, public notes, assets)
  const PUBLIC_PREFIXES = ['/_next', '/favicon', '/public', '/api/ui/public'];
  
  // ✅ SÉCURITÉ : Traitement spécial pour les pages publiques avec logging
  if (url.pathname.startsWith('/@')) {
    // Log des tentatives d'accès aux pages publiques pour monitoring
    console.log(`🔍 [MIDDLEWARE] Tentative d'accès à la page publique: ${url.pathname}`);
    
    // Créer un client Supabase pour gérer les cookies d'authentification
    let response = NextResponse.next({
      request: {
        headers: req.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            req.cookies.set({
              name,
              value,
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: req.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            req.cookies.set({
              name,
              value: '',
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: req.headers,
              },
            });
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Rafraîchir la session si nécessaire
    await supabase.auth.getUser();

    response.headers.set('x-request-id', resRid);
    return response;
  }

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