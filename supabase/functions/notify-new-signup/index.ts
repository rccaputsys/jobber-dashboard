import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  try {
    const payload = await req.json();
    const type = payload.type;
    const record = payload.record;

    if (type !== "INSERT") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: allConnections } = await supabase
      .from("jobber_connections")
      .select("billing_status, trial_ends_at")
      .limit(10000);

    const active = (allConnections || []).filter(c =>
      c.billing_status && c.billing_status.toLowerCase() !== "inactive" && c.billing_status.toLowerCase() !== "canceled"
    );
    const activeCount = active.length;

    const subscribers = (allConnections || []).filter(c =>
      c.billing_status && c.billing_status.toLowerCase() === "active"
    ).length;

    const now = new Date();
    let bucket15to11 = 0;
    let bucket10to6 = 0;
    let bucket5to2 = 0;
    let bucket1 = 0;

    for (const c of allConnections || []) {
      if (!c.trial_ends_at) continue;
      const trialEnd = new Date(c.trial_ends_at);
      const diffMs = trialEnd.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysLeft >= 11 && daysLeft <= 15) bucket15to11++;
      else if (daysLeft >= 6 && daysLeft <= 10) bucket10to6++;
      else if (daysLeft >= 2 && daysLeft <= 5) bucket5to2++;
      else if (daysLeft === 1) bucket1++;
    }

    const ownerName = record.owner_name || "Unknown";
    const companyName = record.company_name || "Unknown";
    const businessType = record.business_type || "N/A";
    const teamSize = record.team_size || "N/A";
    const createdAt = record.created_at ? new Date(record.created_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "N/A";

    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>'
      + '<body style="margin:0;padding:0;background-color:#0b0e1a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">'
      + '<div style="max-width:560px;margin:0 auto;padding:32px 16px;">'

      // Logo
      + '<div style="text-align:center;margin-bottom:28px;">'
      + '<h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Owner<span style="color:#6366f1;">View</span></h1>'
      + '</div>'

      // New signup card
      + '<div style="background:#141829;border:1px solid #1e2340;border-radius:14px;overflow:hidden;margin-bottom:14px;">'
      + '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">'
      + '<tr><td style="padding:24px 28px 16px;">'
      + '<table width="100%" cellpadding="0" cellspacing="0"><tr>'
      + '<td><p style="margin:0;color:#6366f1;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">New Signup</p></td>'
      + '<td style="text-align:right;"><span style="background:#6366f1;color:#ffffff;font-size:10px;font-weight:600;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">Just Now</span></td>'
      + '</tr></table>'
      + '<h2 style="margin:10px 0 0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.3px;">' + companyName + '</h2>'
      + '</td></tr>'
      + '<tr><td style="padding:4px 28px 24px;">'
      + '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#1a1f36;border-radius:10px;border:1px solid #252b48;">'
      + '<tr><td style="padding:13px 16px;border-bottom:1px solid #252b48;width:40%;"><span style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Owner</span></td><td style="padding:13px 16px;border-bottom:1px solid #252b48;text-align:right;"><span style="color:#e2e8f0;font-size:14px;font-weight:600;">' + ownerName + '</span></td></tr>'
      + '<tr><td style="padding:13px 16px;border-bottom:1px solid #252b48;"><span style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Type</span></td><td style="padding:13px 16px;border-bottom:1px solid #252b48;text-align:right;"><span style="color:#e2e8f0;font-size:14px;">' + businessType + '</span></td></tr>'
      + '<tr><td style="padding:13px 16px;"><span style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Team Size</span></td><td style="padding:13px 16px;text-align:right;"><span style="color:#e2e8f0;font-size:14px;">' + teamSize + '</span></td></tr>'
      + '</table>'
      + '</td></tr>'
      + '<tr><td style="padding:0 28px 20px;text-align:center;">'
      + '<p style="margin:0;color:#475569;font-size:11px;">' + createdAt + '</p>'
      + '</td></tr>'
      + '</table>'
      + '</div>'

      // Stats row - using nested tables for email compatibility
      + '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:7px 0;margin-bottom:7px;">'
      + '<tr>'
      + '<td width="50%" style="background:#141829;border:1px solid #1e2340;border-radius:12px;text-align:center;padding:22px 16px;">'
      + '<p style="margin:0;color:#22c55e;font-size:36px;font-weight:800;line-height:1;">' + activeCount + '</p>'
      + '<p style="margin:8px 0 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Active Users</p>'
      + '</td>'
      + '<td width="50%" style="background:#141829;border:1px solid #1e2340;border-radius:12px;text-align:center;padding:22px 16px;">'
      + '<p style="margin:0;color:#6366f1;font-size:36px;font-weight:800;line-height:1;">' + subscribers + '</p>'
      + '<p style="margin:8px 0 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Subscribers</p>'
      + '</td>'
      + '</tr>'
      + '</table>'

      // Trial buckets card
      + '<div style="background:#141829;border:1px solid #1e2340;border-radius:12px;overflow:hidden;">'
      + '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">'
      + '<tr><td style="padding:18px 24px;border-bottom:1px solid #1e2340;">'
      + '<p style="margin:0;color:#ffffff;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Trials by Days Remaining</p>'
      + '</td></tr>'
      + '<tr><td style="padding:0;">'
      + '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">'
      + '<tr><td style="padding:13px 24px;border-bottom:1px solid #1e2340;color:#94a3b8;font-size:13px;">15 – 11 days</td><td style="padding:13px 24px;border-bottom:1px solid #1e2340;text-align:right;color:#ffffff;font-size:16px;font-weight:700;">' + bucket15to11 + '</td></tr>'
      + '<tr><td style="padding:13px 24px;border-bottom:1px solid #1e2340;color:#94a3b8;font-size:13px;">10 – 6 days</td><td style="padding:13px 24px;border-bottom:1px solid #1e2340;text-align:right;color:#ffffff;font-size:16px;font-weight:700;">' + bucket10to6 + '</td></tr>'
      + '<tr><td style="padding:13px 24px;border-bottom:1px solid #1e2340;color:#94a3b8;font-size:13px;">5 – 2 days</td><td style="padding:13px 24px;border-bottom:1px solid #1e2340;text-align:right;color:#f59e0b;font-size:16px;font-weight:700;">' + bucket5to2 + '</td></tr>'
      + '<tr><td style="padding:13px 24px;color:#94a3b8;font-size:13px;">1 day</td><td style="padding:13px 24px;text-align:right;color:#ef4444;font-size:16px;font-weight:700;">' + bucket1 + '</td></tr>'
      + '</table>'
      + '</td></tr>'
      + '</table>'
      + '</div>'

      // Footer
      + '<div style="text-align:center;margin-top:28px;">'
      + '<p style="margin:0;color:#334155;font-size:11px;">OwnerView Internal Alert System</p>'
      + '</div>'

      + '</div>'
      + '</body></html>';

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "alerts@ownerview.io",
        to: ["ryan@ownerview.io"],
        subject: "New Signup: " + companyName + " (" + ownerName + ")",
        html: html,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify({ ok: true, resend: data }), { status: 200 });
  } catch (err) {
    console.error("Notify error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
});
