// src/app/api/export/jobber-visit-fields/route.ts
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

  try {
    // 1. Introspect Visit type
    const visitIntrospection = await jobberGraphQL<any>(token, `
      query {
        __type(name: "Visit") {
          name
          fields {
            name
            type {
              kind
              name
              ofType { kind name ofType { kind name } }
            }
          }
        }
      }
    `);

    const visitFields = (visitIntrospection?.__type?.fields ?? [])
      .map((f: any) => ({ name: f.name, type: f.type?.name || f.type?.kind || f.type?.ofType?.name || "unknown" }));

    // 1b. Introspect VisitsInfo type
    const visitsInfoIntrospection = await jobberGraphQL<any>(token, `
      query { __type(name: "VisitsInfo") { fields { name type { kind name ofType { kind name } } } } }
    `);
    const visitsInfoFields = (visitsInfoIntrospection?.__type?.fields ?? [])
      .map((f: any) => ({ name: f.name, type: f.type?.name || f.type?.ofType?.name || "unknown" }));

    // 2. Check if Job type has a visits connection
    const jobIntrospection = await jobberGraphQL<any>(token, `
      query {
        __type(name: "Job") {
          fields {
            name
            type {
              kind
              name
              ofType { kind name }
            }
          }
        }
      }
    `);

    const jobFields = (jobIntrospection?.__type?.fields ?? []).map((f: any) => f.name);
    const visitRelatedFields = jobFields.filter((f: string) =>
      f.toLowerCase().includes("visit") || f.toLowerCase().includes("recur") || f.toLowerCase().includes("schedule")
    );

    // 3. Fetch sample jobs with visits
    let sampleVisit: any = null;
    try {
      const jobVisitData = await jobberGraphQL<any>(token, `
        query {
          jobs(first: 3) {
            nodes {
              id
              title
              jobNumber
              total
              jobStatus
              visits(first: 5) {
                totalCount
                nodes {
                  id
                  title
                  startAt
                  endAt
                  completedAt
                  visitStatus
                  isComplete
                  duration
                }
              }
            }
          }
        }
      `);
      sampleVisit = jobVisitData?.jobs?.nodes ?? null;
    } catch (e: any) {
      sampleVisit = { error: String(e?.message ?? e) };
    }

    return NextResponse.json({
      ok: true,
      visitType: {
        fieldCount: visitFields.length,
        fields: visitFields,
      },
      visitsInfoType: visitsInfoFields,
      jobVisitRelatedFields: visitRelatedFields,
      sampleVisit,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
