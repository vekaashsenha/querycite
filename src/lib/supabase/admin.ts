export type SupabaseAdminConfig = {
  url: string;
  serviceRoleKey: string;
};

export function getSupabaseAdminConfig(): SupabaseAdminConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

export function isSupabaseAdminConfigured() {
  return Boolean(getSupabaseAdminConfig());
}

export async function insertSupabaseRow<T extends Record<string, unknown>>(table: string, payload: T) {
  const config = getSupabaseAdminConfig();
  if (!config) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  const response = await fetch(`${config.url.replace(/\/$/, "")}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Supabase insert failed for ${table}.`);
  }

  return (await response.json()) as Array<T & { id?: string }>;
}
function createQueryString(params?: Record<string, string | number | boolean | null | undefined>) {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function selectSupabaseRows<T extends Record<string, unknown>>(table: string, params?: Record<string, string | number | boolean | null | undefined>) {
  const config = getSupabaseAdminConfig();
  if (!config) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  const response = await fetch(`${config.url.replace(/\/$/, "")}/rest/v1/${table}${createQueryString(params)}`, {
    method: "GET",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Supabase select failed for ${table}.`);
  }

  return (await response.json()) as T[];
}

export async function updateSupabaseRows<T extends Record<string, unknown>>(table: string, params: Record<string, string | number | boolean | null | undefined>, payload: Partial<T>) {
  const config = getSupabaseAdminConfig();
  if (!config) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  const response = await fetch(`${config.url.replace(/\/$/, "")}/rest/v1/${table}${createQueryString(params)}`, {
    method: "PATCH",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Supabase update failed for ${table}.`);
  }

  return (await response.json()) as Array<T & { id?: string }>;
}

export async function upsertSupabaseRow<T extends Record<string, unknown>>(table: string, payload: T, onConflict: string) {
  const config = getSupabaseAdminConfig();
  if (!config) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  const response = await fetch(`${config.url.replace(/\/$/, "")}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Supabase upsert failed for ${table}.`);
  }

  return (await response.json()) as Array<T & { id?: string }>;
}