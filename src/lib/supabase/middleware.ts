import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const path = request.nextUrl.pathname;

    if (path.startsWith("/auth/callback") || path === "/anmelden") {
      if (session && path === "/anmelden") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/anmelden";
      return NextResponse.redirect(url);
    }
  } catch {
    // If auth check fails, let the request through rather than freezing
    return supabaseResponse;
  }

  return supabaseResponse;
}
