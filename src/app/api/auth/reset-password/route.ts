import { NextResponse } from "next/server";
import { clearSessionCookies, updatePasswordWithAccessToken } from "@/lib/auth/server";

export const runtime = "nodejs";

type ResetPasswordRequest = {
  access_token?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as ResetPasswordRequest;
    const accessToken = typeof body.access_token === "string" ? body.access_token : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!accessToken) {
      return NextResponse.json({ error: "Reset link is invalid or expired. Please request a new password reset link." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    await updatePasswordWithAccessToken(accessToken, password);
    const response = NextResponse.json({ ok: true, message: "Your password has been updated. Please login again." });
    clearSessionCookies(response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Password could not be updated. Please request a new reset link.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
