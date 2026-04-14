// src/app/api/jobber/currency/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getValidAccessToken } from "@/lib/jobberAuth";
import { jobberGraphQL } from "@/lib/jobberGraphQL";
import { getUser } from "@/lib/supabaseAuth";

async function tryCurrencyQuery(accessToken: string, query: string) {
  return jobberGraphQL<any>(accessToken, query);
}

export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const connection_id = searchParams.get("connection_id");

    if (!connection_id) {
      return NextResponse.json({ ok: false, error: "Missing connection_id" }, { status: 400 });
    }

    const { data: ownerCheck } = await supabaseAdmin
      .from("jobber_connections")
      .select("id")
      .eq("id", connection_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!ownerCheck) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const accessToken = await getValidAccessToken(connection_id);

    // Different Jobber accounts expose currency differently.
    // We try variants until one works.
    const variants = [
      {
        name: "company.currencyCode",
        query: `
          query {
            company {
              currencyCode
            }
          }
        `,
        extract: (d: any) => d?.company?.currencyCode,
      },
      {
        name: "company.currency",
        query: `
          query {
            company {
              currency
            }
          }
        `,
        extract: (d: any) => d?.company?.currency,
      },
      {
        name: "account.currencyCode",
        query: `
          query {
            account {
              currencyCode
            }
          }
        `,
        extract: (d: any) => d?.account?.currencyCode,
      },
      {
        name: "account.currency",
        query: `
          query {
            account {
              currency
            }
          }
        `,
        extract: (d: any) => d?.account?.currency,
      },
    ];

    let currency: string | null = null;
    let source: string | null = null;

    for (const v of variants) {
      try {
        const data = await tryCurrencyQuery(accessToken, v.query);
        const val = v.extract(data);
        if (typeof val === "string" && val.length === 3) {
          currency = val.toUpperCase();
          source = v.name;
          break;
        }
      } catch {
        // ignore and try next variant
      }
    }

    if (!currency) {
      // Safe default — do NOT error
      currency = "USD";
      source = "default";
    }

    const { error } = await supabaseAdmin
      .from("jobber_connections")
      .update({ currency_code: currency })
      .eq("id", connection_id);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      currency_code: currency,
      source,
    });
  } catch (e) {
    console.error("Currency endpoint error:", e);
    return NextResponse.json(
      { ok: false, error: "Unable to fetch currency" },
      { status: 500 }
    );
  }
}
