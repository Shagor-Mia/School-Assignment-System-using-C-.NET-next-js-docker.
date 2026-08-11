import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getUserFromToken } from "@/lib/auth";

// GET /api/auth/me
// Decodes the JWT from the httpOnly cookie (no signature verification — this
// is only used so the UI knows who's logged in for display/conditional
// rendering purposes) and returns { user } or 401 if missing/invalid.
export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }

  const user = getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ message: "Invalid session." }, { status: 401 });
  }

  return NextResponse.json({ user });
}
