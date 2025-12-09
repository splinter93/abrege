import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

type CookieStore = {
  get: (name: string) => { value: string } | undefined;
  set: (options: { name: string; value: string } & CookieOptions) => void;
  delete: (options: { name: string } & CookieOptions) => void;
};

export function createSupabaseServerClient(request?: NextRequest) {
  const cookieStore = cookies() as unknown as CookieStore;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Si on a une requête, essayer de lire les cookies depuis la requête
          if (request) {
            const cookie = request.cookies.get(name);
            if (cookie) {
              return cookie.value;
            }
          }
          // Sinon, utiliser les cookies Next.js
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );
}
