import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims() refreshes an expired session and verifies the JWT locally (no Auth round trip).
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  const path = request.nextUrl.pathname;
  const isAuthRoute = path === "/login";
  const isProtectedRoute = path.startsWith("/admin") || path.startsWith("/member");

  if (!userId && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (userId && isAuthRoute) {
    // Only bounce to the app if it will accept this user; otherwise pages redirect back
    // to /login and loop. Deactivated / profile-less / building-less users get signed out.
    const profile = await prisma.profile.findUnique({ where: { authUserId: userId } });
    if (profile?.isActive && (profile.role === "SUPER_ADMIN" || profile.buildingId)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    await supabase.auth.signOut();
  }

  return response;
}
