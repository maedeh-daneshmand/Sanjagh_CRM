import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "sanjagh_session";

function getJwtSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return new TextEncoder().encode("sanjagh-default-secret-key-at-least-32-chars-long");
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow health check and static routes
  if (
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Read session cookie
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let userPayload: { userId?: string; role?: string } | null = null;

  if (token) {
    try {
      const verified = await jwtVerify(token, getJwtSecret());
      userPayload = verified.payload as { userId?: string; role?: string };
    } catch {
      // Token expired or invalid
      userPayload = null;
    }
  }

  const isAuth = !!userPayload?.userId;
  const isLoginPage = pathname === "/login";

  // 3. Unauthenticated -> redirect to /login
  if (!isAuth) {
    if (isLoginPage) {
      return NextResponse.next();
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Authenticated user visiting /login -> redirect to /
  if (isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 5. Role-based Route Blocking:
  const role = userPayload?.role;

  // SALES cannot access /team, /campaigns, /automations, /users, /admin
  if (role === "SALES") {
    if (
      pathname.startsWith("/team") ||
      pathname.startsWith("/campaigns") ||
      pathname.startsWith("/automations") ||
      pathname.startsWith("/users") ||
      pathname.startsWith("/admin")
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // MANAGER cannot access /users or /admin
  if (role === "MANAGER") {
    if (pathname.startsWith("/users") || pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|pictures).*)"],
};
