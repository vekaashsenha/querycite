import { NextResponse } from "next/server";
import { cleanAuthEmail, sendPasswordResetEmail } from "@/lib/auth/server";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const safeMessage = "If an account exists for this email, we have sent a password reset link.";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string };
    const email = cleanAuthEmail(body.email);

    if (!emailPattern.test(email)) {
      return NextResponse.json({ error: "Please enter a valid work email." }, { status: 400 });
    }

    try {
      await sendPasswordResetEmail(request, email);
    } catch (error) {
      console.error("Password reset email request failed", error);
      if (error instanceof Error && error.message.includes("Supabase Auth is not configured")) {
        return NextResponse.json({ error: "Password reset is temporarily unavailable." }, { status: 503 });
      }
    }

    return NextResponse.json({ ok: true, message: safeMessage });
  } catch (error) {
    console.error("Forgot password failed", error);
    return NextResponse.json({ error: "Password reset is temporarily unavailable." }, { status: 500 });
  }
}
