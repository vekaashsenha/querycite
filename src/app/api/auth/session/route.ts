import { NextResponse } from "next/server";
import { getUserFromAccessToken, safeReturnPath, setSessionCookies, syncAuthenticatedUser } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { access_token?: string; refresh_token?: string; expires_in?: number; next?: string };
    const accessToken = typeof body.access_token === "string" ? body.access_token : "";
    const refreshToken = typeof body.refresh_token === "string" ? body.refresh_token : "";
    const next = safeReturnPath(body.next);

    if (!accessToken) {
      return NextResponse.json({ error: "Session token was missing. Please log in." }, { status: 400 });
    }

    const user = await getUserFromAccessToken(accessToken);
    if (!user) {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }

    await syncAuthenticatedUser(user);
    const response = NextResponse.json({ ok: true, next, user });
    setSessionCookies(response, { access_token: accessToken, refresh_token: refreshToken, expires_in: body.expires_in || 3600 });
    return response;
  } catch (error) {
    console.error("Auth callback session failed", error);
    return NextResponse.json({ error: "Session could not be completed. Please log in." }, { status: 500 });
  }
}
