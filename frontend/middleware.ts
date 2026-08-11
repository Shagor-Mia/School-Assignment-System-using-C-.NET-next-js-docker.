import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getRoleFromToken, roleHomePath } from "@/lib/auth";
import type { Role } from "@/lib/types";

// IMPORTANT: This middleware is UX-only routing (avoids flashing the wrong
// dashboard / bouncing users to a login page they're already past). It is
// NOT the security boundary — a user could in principle craft a request that
// skips this. The actual enforcement lives on the backend via
// `[Authorize(Roles = "...")]` on every controller action; every real data
// call goes through `/api/backend/*`, which attaches the JWT server-side,
// and the ASP.NET pipeline validates that JWT's signature and role claims
// independently of anything decided here.

const ROLE_PREFIXES: { prefix: string; role: Role }[] = [
  { prefix: "/admin", role: "Admin" },
  { prefix: "/teacher", role: "Teacher" },
  { prefix: "/student", role: "Student" },
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const role = token ? getRoleFromToken(token) : null;

  const matchedRoleRoute = ROLE_PREFIXES.find((r) => pathname.startsWith(r.prefix));

  if (matchedRoleRoute) {
    if (!role) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role !== matchedRoleRoute.role) {
      return NextResponse.redirect(new URL(roleHomePath(role), req.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/login" && role) {
    return NextResponse.redirect(new URL(roleHomePath(role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/login"],
};
