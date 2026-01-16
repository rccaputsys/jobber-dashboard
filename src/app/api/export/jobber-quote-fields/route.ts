// src/app/api/export/jobber-quote-fields/route.ts
import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/jobberAuth";
import { jobberGraphQL } from "@/lib/jobberGraphQL";

// Introspect Quote fields so we can use the correct schema names (status, totals, url, etc.)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connection_id");
  if (!connectionId) {
    return NextResponse.json({ ok: false, error: "Missing connection_id" }, { status: 400 });
  }

  const token = await getValidAccessToken(connectionId);

  // 1) Schema fields for Quote
  const schema = await jobberGraphQL<{
    __type: {
      name: string;
      fields: { name: string; type: { name: string | null; kind: string; ofType: any } }[];
    };
  }>(
    token,
    `query {
      __type(name: "Quote") {
        name
        fields {
          name
          type { name kind ofType { name kind ofType { name kind } } }
        }
      }
    }`
  );

  const quoteFieldNames = (schema.__type?.fields ?? []).map((f) => f.name).sort();

  // 2) Sample quote query attempt (best effort; we’ll only use fields if they exist)
  // We'll try a minimal safe sample: id + quoteNumber + createdAt + updatedAt + sentAt
  let sample: any = null;
  let sampleError: any = null;

  try {
    sample = await jobberGraphQL<any>(
      token,
      `query {
        quotes(first: 1) {
          nodes {
            id
            quoteNumber
            createdAt
            updatedAt
            sentAt
          }
        }
      }`
    );
  } catch (e: any) {
    sampleError = e?.message ?? String(e);
  }

  return NextResponse.json({
    ok: true,
    quoteFieldCount: quoteFieldNames.length,
    quoteFieldNames,
    sampleQuote: sampleError
      ? { sampleError }
      : (sample?.quotes?.nodes?.[0] ?? null),
  });
}
