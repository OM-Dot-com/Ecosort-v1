import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Updates the Supabase auth session by refreshing cookies and
 * enforces authentication for protected routes (e.g. /dashboard/*).
 * Unauthenticated users hitting protected routes are redirected to /auth/login.
 */
export async function updateSession(request: NextRequest) {
  // If Supabase credentials are not configured, skip auth entirely
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_supabase_project_url') {
    // No Supabase configured — allow all routes but redirect dashboard to login
    const protectedPaths = ['/dashboard'];
    const isProtectedRoute = protectedPaths.some((path) =>
      request.nextUrl.pathname.startsWith(path)
    );
    if (isProtectedRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/auth/login';
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANT: Do NOT run any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake here can lead to very
  // hard-to-debug auth issues where random users get logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define protected route patterns
  const protectedPaths = ['/dashboard'];
  const isProtectedRoute = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Redirect unauthenticated users away from protected routes
  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  const authPaths = ['/auth/login', '/auth/register'];
  const isAuthRoute = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  // IMPORTANT: Return the supabaseResponse object as-is. If you create a new
  // response object (e.g. NextResponse.next()) make sure to:
  // 1. Pass the request: NextResponse.next({ request })
  // 2. Copy over all cookies: supabaseResponse.cookies → new response cookies
  // Failing to do so may cause the browser and server to go out of sync and
  // terminate the user's session prematurely.
  return supabaseResponse;
}
