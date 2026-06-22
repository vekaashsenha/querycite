import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getSupabaseServerConfig } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured, selectSupabaseRows, updateSupabaseRows, upsertSupabaseRow } from "@/lib/supabase/admin";

const accessCookieName = "querycite_access_token";
const refreshCookieName = "querycite_refresh_token";
const defaultSessionAge = 60 * 60;
const refreshSessionAge = 60 * 60 * 24 * 30;

export type QueryCiteUser = {
  id: string;
  email: string;
  name: string | null;
  emailConfirmedAt: string | null;
};

type SupabaseAuthUser = {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown> | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
};

type SupabaseAuthSession = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: SupabaseAuthUser | null;
};

type LeadRow = {
  id?: string | null;
  report_id?: string | null;
};

type ReportRow = {
  id?: string | null;
  audit_id?: string | null;
};

type ProfileRoleRow = {
  role?: string | null;
};

function authBaseUrl() {
  const config = getSupabaseServerConfig();
  if (!config) return null;
  return `${config.url.replace(/\/$/, "")}/auth/v1`;
}

function authHeaders(accessToken?: string) {
  const config = getSupabaseServerConfig();
  if (!config) throw new Error("Supabase Auth environment variables are not configured.");

  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${accessToken || config.anonKey}`,
    "Content-Type": "application/json",
  };
}

function appBaseUrl(request?: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (!request) return "http://localhost:3000";

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

export function authCallbackUrl(request?: Request) {
  return `${appBaseUrl(request)}/auth/callback`;
}

function requestBaseUrl(request?: Request) {
  if (!request) return appBaseUrl();
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || (host?.includes("localhost") || host?.includes("127.0.0.1") ? "http" : "https");
  return host ? `${protocol}://${host}` : appBaseUrl();
}

function passwordResetBaseUrl(request?: Request) {
  const requestUrl = requestBaseUrl(request);
  if (/localhost|127\.0\.0\.1/i.test(requestUrl)) return requestUrl.replace(/\/$/, "");
  return appBaseUrl(request).replace(/\/$/, "");
}

export function passwordResetUrl(request?: Request) {
  return `${passwordResetBaseUrl(request)}/reset-password`;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function adminEmailAllowlist() {
  const envEmails = (process.env.QUERYCITE_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
  return new Set(["vekaashsenha@gmail.com", ...envEmails]);
}

function isAdminEmail(email: string) {
  return adminEmailAllowlist().has(normalizeEmail(email));
}

export async function isAdminUser(user: QueryCiteUser | null | undefined) {
  if (!user) return false;
  const email = normalizeEmail(user.email);

  if (isSupabaseAdminConfigured()) {
    try {
      const rows = await selectSupabaseRows<ProfileRoleRow>("profiles", {
        select: "role",
        or: `(id.eq.${user.id},user_id.eq.${user.id},email.eq.${email})`,
        order: "updated_at.desc",
        limit: "1",
      });
      if (rows[0]?.role === "admin") return true;
    } catch (error) {
      console.error("Admin role lookup failed", error);
    }
  }

  return isAdminEmail(email);
}

function compactText(value: unknown, max = 180) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function toQueryCiteUser(user: SupabaseAuthUser): QueryCiteUser | null {
  if (!user.id || !user.email) return null;
  const metadata = user.user_metadata || {};
  const name = compactText(metadata.full_name || metadata.name) || null;
  return {
    id: user.id,
    email: user.email.toLowerCase(),
    name,
    emailConfirmedAt: user.email_confirmed_at || user.confirmed_at || null,
  };
}

async function readAuthError(response: Response, fallback: string) {
  let detail = "";
  try {
    const body = await response.json() as { msg?: string; message?: string; error_description?: string; error?: string };
    detail = body.error_description || body.msg || body.message || body.error || "";
  } catch {
    detail = await response.text().catch(() => "");
  }

  const normalized = detail.toLowerCase();
  if (normalized.includes("email not confirmed")) return "Please confirm your email before logging in.";
  if (normalized.includes("invalid login") || normalized.includes("invalid credentials")) return "Invalid login. Please check your email and password.";
  if (normalized.includes("already registered") || normalized.includes("already exists") || normalized.includes("user already")) return "This email may already be registered. Please login or reset your password.";
  if (normalized.includes("password")) return detail || "Please use a stronger password.";
  return detail || fallback;
}

export async function signUpWithPassword(request: Request, name: string, email: string, password: string) {
  const base = authBaseUrl();
  if (!base) throw new Error("Supabase Auth is not configured.");

  const response = await fetch(`${base}/signup?redirect_to=${encodeURIComponent(authCallbackUrl(request))}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password, data: { full_name: name, name } }),
  });

  if (!response.ok) {
    throw new Error(await readAuthError(response, "Signup could not be completed right now."));
  }

  return await response.json() as SupabaseAuthSession;
}

export async function signInWithPassword(email: string, password: string) {
  const base = authBaseUrl();
  if (!base) throw new Error("Supabase Auth is not configured.");

  const response = await fetch(`${base}/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await readAuthError(response, "Login could not be completed right now."));
  }

  return await response.json() as SupabaseAuthSession;
}
export async function sendPasswordResetEmail(request: Request, email: string) {
  const base = authBaseUrl();
  if (!base) throw new Error("Supabase Auth is not configured.");

  const response = await fetch(`${base}/recover?redirect_to=${encodeURIComponent(passwordResetUrl(request))}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(await readAuthError(response, "Password reset email could not be sent right now."));
  }
}

export async function updatePasswordWithAccessToken(accessToken: string, password: string) {
  const base = authBaseUrl();
  if (!base) throw new Error("Supabase Auth is not configured.");

  const response = await fetch(`${base}/user`, {
    method: "PUT",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    throw new Error(await readAuthError(response, "Password could not be updated. Please request a new reset link."));
  }

  const user = await response.json() as SupabaseAuthUser;
  return toQueryCiteUser(user);
}

export async function getUserFromAccessToken(accessToken: string) {
  const base = authBaseUrl();
  if (!base) return null;

  const response = await fetch(`${base}/user`, {
    method: "GET",
    headers: authHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) return null;
  const user = await response.json() as SupabaseAuthUser;
  return toQueryCiteUser(user);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessCookieName)?.value;
  if (!accessToken) return null;
  return getUserFromAccessToken(accessToken);
}

export async function requireAuthenticatedUser(returnPath: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnPath)}&error=session_expired`);
  }
  return user;
}

export function setSessionCookies(response: NextResponse, session: SupabaseAuthSession) {
  if (session.access_token) {
    response.cookies.set(accessCookieName, session.access_token, cookieOptions(session.expires_in || defaultSessionAge));
  }
  if (session.refresh_token) {
    response.cookies.set(refreshCookieName, session.refresh_token, cookieOptions(refreshSessionAge));
  }
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(accessCookieName, "", { ...cookieOptions(0), maxAge: 0 });
  response.cookies.set(refreshCookieName, "", { ...cookieOptions(0), maxAge: 0 });
}

export function userFromSession(session: SupabaseAuthSession) {
  return session.user ? toQueryCiteUser(session.user) : null;
}

export async function syncAuthenticatedUser(user: QueryCiteUser, name?: string | null) {
  if (!isSupabaseAdminConfigured()) return;

  const now = new Date().toISOString();
  const displayName = compactText(name || user.name || "") || null;

  try {
    await upsertSupabaseRow("profiles", {
      id: user.id,
      user_id: user.id,
      email: user.email,
      name: displayName,
      full_name: displayName,
      onboarding_status: "started",
      updated_at: now,
      created_at: now,
    }, "id");
  } catch (error) {
    console.error("Profile sync failed", error);
  }

  const emailFilters = { email: `eq.${user.email}` };
  await Promise.allSettled([
    updateSupabaseRows("leads", emailFilters, { user_id: user.id, updated_at: now }),
    updateSupabaseRows("subscriptions", emailFilters, { user_id: user.id, updated_at: now }),
    updateSupabaseRows("payments", emailFilters, { user_id: user.id, updated_at: now }),
    updateSupabaseRows("company_profiles", emailFilters, { owner_user_id: user.id, updated_at: now }),
    updateSupabaseRows("competitors", emailFilters, { user_id: user.id, updated_at: now }),
    updateSupabaseRows("competitor_change_limits", emailFilters, { user_id: user.id, updated_at: now }),
    updateSupabaseRows("advisor_credit_usage", emailFilters, { user_id: user.id, updated_at: now }),
  ]);

  try {
    const leads = await selectSupabaseRows<LeadRow>("leads", {
      select: "id,report_id",
      email: `eq.${user.email}`,
      report_id: "not.is.null",
      limit: "100",
    });
    const reportIds = leads.map((lead) => lead.report_id).filter((value): value is string => Boolean(value));
    for (const reportId of reportIds) {
      await updateSupabaseRows("reports", { id: `eq.${reportId}` }, { user_id: user.id, updated_at: now });
      const reportRows = await selectSupabaseRows<ReportRow>("reports", { select: "id,audit_id", id: `eq.${reportId}`, limit: "1" });
      const auditId = reportRows[0]?.audit_id;
      if (auditId) {
        await updateSupabaseRows("audits", { id: `eq.${auditId}` }, { user_id: user.id, updated_at: now });
      }
    }
  } catch (error) {
    console.error("Report ownership sync failed", error);
  }
}

export function safeReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export function cleanAuthEmail(value: unknown) {
  return normalizeEmail(value);
}

export function cleanAuthText(value: unknown, max = 180) {
  return compactText(value, max);
}
