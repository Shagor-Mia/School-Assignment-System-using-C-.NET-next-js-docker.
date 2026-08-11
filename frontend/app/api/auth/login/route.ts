import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getUserFromToken } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/config";
import type { ApiError, LoginRequest } from "@/lib/types";

// POST /api/auth/login
// Reads { email, password } from the request body, calls the backend's
// POST {BACKEND_URL}/api/auth/login, and on success sets the returned JWT as
// an httpOnly cookie. The token itself is NEVER sent back to the browser —
// only `{ user }` is returned — so client-side JS can never read it.
export async function POST(req: NextRequest) {
  let body: LoginRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ApiError>(
      { message: "Invalid request body.", errors: null, traceId: null },
      { status: 400 }
    );
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json<ApiError>(
      {
        message: "Unable to reach the authentication server. Please try again later.",
        errors: null,
        traceId: null,
      },
      { status: 502 }
    );
  }

  if (!backendRes.ok) {
    const errorBody = await backendRes.json().catch(() => null);
    return NextResponse.json<ApiError>(
      errorBody ?? {
        message: "Login failed.",
        errors: null,
        traceId: null,
      },
      { status: backendRes.status }
    );
  }

  const data = await backendRes.json().catch(() => null);
  const token: unknown = data?.token ?? data?.accessToken ?? data?.jwt;

  if (typeof token !== "string" || token.length === 0) {
    return NextResponse.json<ApiError>(
      { message: "Authentication server returned an unexpected response.", errors: null, traceId: null },
      { status: 502 }
    );
  }

  const user = getUserFromToken(token);
  if (!user) {
    return NextResponse.json<ApiError>(
      { message: "Authentication server returned an invalid token.", errors: null, traceId: null },
      { status: 502 }
    );
  }

  const res = NextResponse.json({ user });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days; actual expiry is still enforced by the JWT itself.
  });
  return res;
}
