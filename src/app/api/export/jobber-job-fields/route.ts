// src/app/api/export/jobber-job-fields/route.ts
import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/jobberAuth";
import { jobberGraphQL } from "@/lib/jobberGraphQL";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connection_id");
  if (!connectionId) {
    return NextResponse.json({ ok: false, error: "Missing connection_id" }, { status: 400 });
  }

  const token = await getValidAccessToken(connectionId);

  // GraphQL introspection: list all fields on the Job type
  const introspectionQuery = `
    query {
      __type(name: "Job") {
        name
        fields {
          name
          type {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await jobberGraphQL<any>(token, introspectionQuery);

    const fields = (data?.__type?.fields ?? []).map((f: any) => f?.name).filter(Boolean);

    // Also return 1 sample job node with a *small*, safe set of common fields
    // (we already know these exist because "id/createdAt/updatedAt" worked earlier in your sync)
    const sampleQuery = `
      query {
        jobs(first: 1) {
          nodes {
            id
            createdAt
            updatedAt
            scheduledStartAt
            scheduledEndAt
            startAt
            endAt
            status
          }
        }
      }
    `;
    let sample: any = null;
    try {
      const sampleData = await jobberGraphQL<any>(token, sampleQuery);
      sample = sampleData?.jobs?.nodes?.[0] ?? null;
    } catch (e: any) {
      sample = { sampleError: String(e?.message ?? e) };
    }

    return NextResponse.json({
      ok: true,
      jobFieldCount: fields.length,
      jobFieldNames: fields.sort(),
      sampleJob: sample,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
