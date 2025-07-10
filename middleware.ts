import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Helper to decode JWT payload (base64url)
function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  // Only protect /admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const payload = decodeJwtPayload(token);
    const roleDisplayName = payload?.user?.role?.displayName;
    if (roleDisplayName !== "Super Admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
}; 