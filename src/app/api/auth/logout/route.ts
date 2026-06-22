import { NextResponse } from "next/server";
import { clearSessionCookies, safeReturnPath } from "@/lib/auth/server";

export const runtime = "nodejs";

async function logout(request: Request) {
  const url = new URL(request.url);
  const next = safeReturnPath(url.searchParams.get("next") || "/login");
  const response = NextResponse.redirect(new URL(next, request.url));
  clearSessionCookies(response);
  return response;
}

export async function POST(request: Request) {
  return logout(request);
}

export async function GET(request: Request) {
  return logout(request);
}
