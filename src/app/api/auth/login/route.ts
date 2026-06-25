import { NextResponse } from "next/server";
import { cleanAuthEmail, safeReturnPath, setSessionCookies, signInWithPassword, syncAuthenticatedUser, userFromSession } from "@/lib/auth/server";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string; next?: string };
    const email = cleanAuthEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    const next = safeReturnPath(body.next);

    if (!emailPattern.test(email)) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    if (!password) return NextResponse.json({ error: "Please enter your password." }, { status: 400 });

    const session = await signInWithPassword(email, password);
    const user = userFromSession(session);
    if (!user) return NextResponse.json({ error: "Session could not be created. Please try again." }, { status: 401 });

    await syncAuthenticatedUser(user);
    const response = NextResponse.json({ ok: true, next, user });
    setSessionCookies(response, session);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid login. Please check your email and password.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
