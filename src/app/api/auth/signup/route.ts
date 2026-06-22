import { NextResponse } from "next/server";
import { cleanAuthEmail, cleanAuthText, safeReturnPath, setSessionCookies, signUpWithPassword, syncAuthenticatedUser, userFromSession } from "@/lib/auth/server";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; email?: string; password?: string; next?: string };
    const name = cleanAuthText(body.name, 120);
    const email = cleanAuthEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    const next = safeReturnPath(body.next);

    if (!name) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    if (!emailPattern.test(email)) return NextResponse.json({ error: "Please enter a valid work email." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const session = await signUpWithPassword(request, name, email, password);
    const response = NextResponse.json({ ok: true, next, confirmationRequired: !session.access_token, message: session.access_token ? "Signup complete." : "Check your email to confirm your QueryCite account, then log in." });
    const user = userFromSession(session);

    if (session.access_token) {
      setSessionCookies(response, session);
    }
    if (user) {
      await syncAuthenticatedUser({ ...user, name: user.name || name }, name);
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup could not be completed right now.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
