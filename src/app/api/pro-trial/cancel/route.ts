import { NextResponse } from "next/server";
import { getCurrentUser, syncAuthenticatedUser } from "@/lib/auth/server";
import { getProTrialStatusForUser, markProTrialCancellation } from "@/lib/pro-trial";
import { cancelRazorpaySubscription } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    await syncAuthenticatedUser(user);

    const trial = await getProTrialStatusForUser(user);
    if (!trial.razorpaySubscriptionId) {
      return NextResponse.json({ error: "No trial subscription was found for this account." }, { status: 404 });
    }
    if (trial.status === "cancelled") {
      return NextResponse.json({ ok: true, trial });
    }

    await cancelRazorpaySubscription(trial.razorpaySubscriptionId);
    await markProTrialCancellation(user, trial.razorpaySubscriptionId);
    const updated = await getProTrialStatusForUser(user);
    return NextResponse.json({ ok: true, trial: updated });
  } catch (error) {
    console.error("Pro trial cancellation failed", { message: error instanceof Error ? error.message : "unknown_error" });
    return NextResponse.json({ error: "Could not cancel the trial subscription right now." }, { status: 500 });
  }
}
