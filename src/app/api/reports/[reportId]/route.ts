import { NextResponse } from "next/server";
import { isWebsiteAuditReport, type WebsiteAuditReport } from "@/lib/audit-report";
import { getPaidAccessContextForUser } from "@/lib/paid-foundation";
import { getCurrentUser, syncAuthenticatedUser } from "@/lib/auth/server";
import { isSupabaseAdminConfigured, selectSupabaseRows } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SavedReportRow = {
  id?: string | null;
  audit_id?: string | null;
  user_id?: string | null;
  report_type?: string | null;
  website_url?: string | null;
  full_report_data?: unknown;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toFreeReport(report: WebsiteAuditReport, row: SavedReportRow): WebsiteAuditReport {
  const findings = report.findings.slice(0, 3);
  const fixes = report.fixes.length ? report.fixes.slice(0, 3) : findings;

  return {
    ...report,
    reportId: row.id ?? report.reportId,
    auditId: row.audit_id ?? report.auditId ?? null,
    findings,
    fixes,
    developerNotes: [],
    fullRecommendations: [],
  };
}

function toFullReport(report: WebsiteAuditReport, row: SavedReportRow): WebsiteAuditReport {
  return {
    ...report,
    reportId: row.id ?? report.reportId,
    auditId: row.audit_id ?? report.auditId ?? null,
  };
}

export async function GET(_request: Request, context: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await context.params;

  if (!uuidPattern.test(reportId)) {
    return NextResponse.json({ error: "Invalid report link." }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Saved report access is temporarily unavailable." }, { status: 503 });
  }

  try {
    const rows = await selectSupabaseRows<SavedReportRow>("reports", {
      select: "id,audit_id,user_id,report_type,website_url,full_report_data",
      id: `eq.${reportId}`,
      limit: "1",
    });
    const row = rows[0];

    if (!row || !isWebsiteAuditReport(row.full_report_data)) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const user = await getCurrentUser();
    let canReturnFull = false;
    if (user) {
      await syncAuthenticatedUser(user);
      const access = await getPaidAccessContextForUser(user);
      canReturnFull = Boolean(access.verifiedPaidAccess && row.user_id === user.id);
    }

    return NextResponse.json({
      report: canReturnFull ? toFullReport(row.full_report_data, row) : toFreeReport(row.full_report_data, row),
      accessLevel: canReturnFull ? "full" : "free",
    });
  } catch (error) {
    console.error("Saved report lookup failed", error);
    return NextResponse.json({ error: "Saved report access is temporarily unavailable." }, { status: 500 });
  }
}