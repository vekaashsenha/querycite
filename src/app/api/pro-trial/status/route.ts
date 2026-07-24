import { NextResponse } from "next/server";
import { getCurrentUser, syncAuthenticatedUser } from "@/lib/auth/server";
import { getProTrialStatusForUser } from "@/lib/pro-trial";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    await syncAuthenticatedUser(user);
    const trial = await getProTrialStatusForUser(user);
    return NextResponse.json(trial);
  } catch (error) {
    console.error("Pro trial status lookup failed", { message: error instanceof Error ? error.message : "unknown_error" });
    return NextResponse.json({ error: "Could not load trial status." }, { status: 500 });
  }
}
