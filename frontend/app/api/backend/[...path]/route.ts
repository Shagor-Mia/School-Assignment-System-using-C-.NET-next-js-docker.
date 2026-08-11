import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/config";

// Single catch-all proxy: every frontend data fetch/mutation goes through
// /api/backend/... instead of hitting the ASP.NET origin directly. This is
// what keeps the JWT out of reach of browser JS — it lives only in the
// httpOnly cookie, and this server-side route is the only place that ever
// reads it and attaches it as an Authorization header.

const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "cookie",
  "content-length",
]);

const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-encoding",
  "content-length",
]);

async function forward(req: NextRequest, pathParts: string[]): Promise<NextResponse> {
  const path = pathParts.join("/");
  const search = req.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/api/${path}${search}`;

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const method = req.method;
  const hasBody = method !== "GET" && method !== "HEAD";

  let backendRes: Response;
  try {
    backendRes = await fetch(targetUrl, {
      method,
      headers,
      // Forward the raw body stream as-is — this preserves multipart
      // form-data (file uploads) as well as JSON bodies without needing to
      // parse/re-serialize either.
      body: hasBody ? req.body : undefined,
      // Required by undici when streaming a body via a ReadableStream.
      duplex: hasBody ? "half" : undefined,
      redirect: "manual",
    } as RequestInit & { duplex?: "half" });
  } catch {
    return NextResponse.json(
      { message: "Unable to reach the backend server.", errors: null, traceId: null },
      { status: 502 }
    );
  }

  const responseHeaders = new Headers();
  backendRes.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  const response = new NextResponse(backendRes.body, {
    status: backendRes.status,
    statusText: backendRes.statusText,
    headers: responseHeaders,
  });

  // A 401 here means the JWT the backend just validated (expired, revoked,
  // signed with an old key, etc.) is no longer good — clear it so the
  // browser's next /login visit isn't immediately bounced back by
  // middleware.ts, which only checks that the cookie decodes, not that it's
  // still valid.
  if (backendRes.status === 401) {
    response.cookies.set(AUTH_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  return forward(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return forward(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return forward(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return forward(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return forward(req, (await ctx.params).path);
}
