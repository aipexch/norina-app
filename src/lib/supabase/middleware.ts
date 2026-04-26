import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SIXTY_DAYS_IN_SECONDS = 60 * 24 * 60 * 60;

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
              supabaseResponse.cookies.set(name, value, {
                ...options,
                maxAge: SIXTY_DAYS_IN_SECONDS,
              })
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const isAuthRoute =
      path.startsWith("/auth/callback") || path === "/anmelden";

    if (user && path === "/anmelden") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (!user && !isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/anmelden";
      return NextResponse.redirect(url);
    }
  } catch {
    // If auth check fails, send to login rather than freezing/leaking access
    const path = request.nextUrl.pathname;
    if (path === "/anmelden" || path.startsWith("/auth/callback")) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/anmelden";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
