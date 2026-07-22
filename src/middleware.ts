import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qgiichnytbukisofuqiv.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_kMnEF2aqyz1z2SOB-sxtCQ_s4J-VisB";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip assets and internal requests
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes("favicon.ico")
  ) {
    return NextResponse.next();
  }

  // 2. Initialize Supabase Server Client for Middleware (Edge compatible)
  let response = NextResponse.next({
    request,
  });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 3. Handle Route Protection
    const isDashboardRoute = pathname.startsWith("/dashboard");
    const isLoginRoute = pathname === "/";

    if (isDashboardRoute) {
      if (!user) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/";
        return NextResponse.redirect(loginUrl);
      }

      // Check role
      const role = user.user_metadata?.role || "customer";
      if (role !== "seller" && role !== "admin") {
        const unauthorizedUrl = request.nextUrl.clone();
        unauthorizedUrl.pathname = "/";
        unauthorizedUrl.searchParams.set("error", "unauthorized");
        await supabase.auth.signOut();
        return NextResponse.redirect(unauthorizedUrl);
      }
    }

    if (isLoginRoute && user) {
      const role = user.user_metadata?.role || "customer";
      if (role === "seller" || role === "admin") {
        const dashboardUrl = request.nextUrl.clone();
        dashboardUrl.pathname = "/dashboard";
        return NextResponse.redirect(dashboardUrl);
      }
    }

    return response;
  } catch (error) {
    console.error("[Seller Middleware Error]:", error);
    return response;
  }
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/dashboard",
  ],
};
