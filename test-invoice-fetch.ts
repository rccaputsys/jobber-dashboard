import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  const { getValidAccessToken } = await import('./src/lib/jobberAuth');
  const { supabaseAdmin } = await import('./src/lib/supabaseAdmin');
  
  const connectionId = '477ad612-6a40-485e-b71d-1799f13c613a';
  const token = await getValidAccessToken(connectionId);

  // === QUOTES ===
  let allQuotes: any[] = [];
  let cursor: string | null = null;

  while (true) {
    const afterClause = cursor ? `, after: "${cursor}"` : "";
    const query = `query {
      quotes(first: 100${afterClause}) {
        nodes {
          id
          quoteNumber
          title
          createdAt
          updatedAt
          sentAt
          quoteStatus
          jobberWebUri
          amounts { total }
        }
        pageInfo { hasNextPage endCursor }
      }
    }`;

    const res = await fetch(process.env.JOBBER_GRAPHQL_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-JOBBER-GRAPHQL-VERSION': process.env.JOBBER_GRAPHQL_VERSION!,
      },
      body: JSON.stringify({ query }),
    });

    const json = await res.json();
    const data = json.data?.quotes;
    if (!data) break;
    
    allQuotes.push(...data.nodes);
    console.log(`Fetched ${allQuotes.length} quotes so far...`);
    
    if (!data.pageInfo.hasNextPage) break;
    cursor = data.pageInfo.endCursor;
  }

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  
  const filteredQuotes = allQuotes.filter(q => new Date(q.createdAt) >= twelveMonthsAgo);
  console.log(`Quotes after 12-month filter: ${filteredQuotes.length}`);

  for (const q of filteredQuotes) {
    const { error } = await supabaseAdmin
      .from("fact_quotes")
      .upsert({
        connection_id: connectionId,
        jobber_quote_id: q.id,
        quote_number: q.quoteNumber ?? null,
        quote_title: q.title ?? null,
        quote_status: q.quoteStatus ?? null,
        quote_url: q.jobberWebUri ?? null,
        quote_total_cents: Math.round((q.amounts?.total ?? 0) * 100),
        created_at_jobber: q.createdAt ?? null,
        updated_at_jobber: q.updatedAt ?? null,
        sent_at: q.sentAt ?? null,
      }, { onConflict: "connection_id,jobber_quote_id" });

    if (error) console.log(`Error on quote ${q.quoteNumber}:`, error.message);
  }
  console.log("Quotes done!");

  // === REQUESTS ===
  let allRequests: any[] = [];
  cursor = null;

  while (true) {
    const afterClause = cursor ? `, after: "${cursor}"` : "";
    const query = `query {
      requests(first: 100${afterClause}) {
        nodes {
          id
          title
          requestStatus
          source
          jobberWebUri
          createdAt
          contactName
          companyName
          email
          phone
          client { id name }
        }
        pageInfo { hasNextPage endCursor }
      }
    }`;

    const res = await fetch(process.env.JOBBER_GRAPHQL_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-JOBBER-GRAPHQL-VERSION': process.env.JOBBER_GRAPHQL_VERSION!,
      },
      body: JSON.stringify({ query }),
    });

    const json = await res.json();
    const data = json.data?.requests;
    if (!data) break;
    
    allRequests.push(...data.nodes);
    console.log(`Fetched ${allRequests.length} requests so far...`);
    
    if (!data.pageInfo.hasNextPage) break;
    cursor = data.pageInfo.endCursor;
  }

  const filteredRequests = allRequests.filter(r => new Date(r.createdAt) >= twelveMonthsAgo);
  console.log(`Requests after 12-month filter: ${filteredRequests.length}`);

  for (const r of filteredRequests) {
    const { error } = await supabaseAdmin
      .from("fact_requests")
      .upsert({
        connection_id: connectionId,
        jobber_request_id: r.id,
        title: r.title ?? null,
        request_status: r.requestStatus ?? null,
        source: r.source ?? null,
        client_name: r.client?.name ?? null,
        client_id: r.client?.id ?? null,
        contact_name: r.contactName ?? null,
        company_name: r.companyName ?? null,
        email: r.email ?? null,
        phone: r.phone ?? null,
        jobber_url: r.jobberWebUri ?? null,
        created_at_jobber: r.createdAt ?? null,
        synced_at: new Date().toISOString(),
      }, { onConflict: "connection_id,jobber_request_id" });

    if (error) console.log(`Error on request ${r.id}:`, error.message);
  }
  console.log("Requests done!");
}

test().catch(console.error);