import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/users/[id]/gdpr-export
 *
 * DSGVO-Art.15-Selbstauskunft: sammelt die für den Ziel-Nutzer gespeicherten Daten aus
 * profiles, subscriptions, payments, applications, high_ticket_applications und
 * step2_applications und liefert sie als downloadbare JSON-Datei. Jeder Export wird als
 * Nachweis in gdpr_export_requests protokolliert (best-effort, blockiert den Download nicht).
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id: targetUserId } = await ctx.params;
  if (!targetUserId) {
    return NextResponse.json({ ok: false, error: "Missing user id." }, { status: 400 });
  }

  const service = createServiceClient();

  const [
    profileRes,
    authUserRes,
    subscriptionsRes,
    paymentsRes,
    applicationsRes,
    htApplicationsRes,
    step2Res,
  ] = await Promise.all([
    service.from("profiles").select("*").eq("id", targetUserId).maybeSingle(),
    service.auth.admin.getUserById(targetUserId),
    service.from("subscriptions").select("*").eq("user_id", targetUserId),
    service.from("payments").select("*").eq("user_id", targetUserId),
    service.from("applications").select("*").eq("user_id", targetUserId),
    service.from("high_ticket_applications").select("*").eq("user_id", targetUserId),
    service.from("step2_applications").select("*").eq("user_id", targetUserId),
  ]);

  if (profileRes.error) {
    return NextResponse.json({ ok: false, error: profileRes.error.message }, { status: 500 });
  }
  if (!profileRes.data) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  const authUser = authUserRes.data?.user ?? null;

  const exportPayload = {
    export_meta: {
      generated_at: new Date().toISOString(),
      generated_by_admin_id: admin.id,
      legal_basis: "DSGVO Art. 15: Auskunftsrecht der betroffenen Person",
      subject_user_id: targetUserId,
    },
    account: {
      email: authUser?.email ?? null,
      email_confirmed_at: authUser?.email_confirmed_at ?? null,
      created_at: authUser?.created_at ?? null,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
    },
    profile: profileRes.data,
    subscriptions: subscriptionsRes.data ?? [],
    payments: paymentsRes.data ?? [],
    applications: applicationsRes.data ?? [],
    high_ticket_applications: htApplicationsRes.data ?? [],
    step2_applications: step2Res.data ?? [],
  };

  const summary = {
    subscriptions_count: (subscriptionsRes.data ?? []).length,
    payments_count: (paymentsRes.data ?? []).length,
    applications_count: (applicationsRes.data ?? []).length,
    high_ticket_applications_count: (htApplicationsRes.data ?? []).length,
    step2_applications_count: (step2Res.data ?? []).length,
  };

  const { error: logErr } = await service.from("gdpr_export_requests").insert({
    user_id: targetUserId,
    requested_by: admin.id,
    status: "completed",
    export_summary: summary,
    completed_at: new Date().toISOString(),
  });
  if (logErr) {
    console.error("[gdpr-export] Nachweis-Log fehlgeschlagen:", logErr.message);
  }

  const json = JSON.stringify(exportPayload, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `dsgvo-auskunft_${targetUserId}_${date}.json`;

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
