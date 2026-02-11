import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  const { getValidAccessToken } = await import('./src/lib/jobberAuth');
  
  const connectionId = '477ad612-6a40-485e-b71d-1799f13c613a';
  const token = await getValidAccessToken(connectionId);

  const resources = ['jobs', 'invoices', 'quotes', 'requests'];
  
  for (const resource of resources) {
    const query = `query {
      ${resource}(first: 3, filter: { updatedAt: { after: "2026-02-10T00:00:00Z" } }) {
        nodes {
          id
        }
        pageInfo {
          hasNextPage
        }
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
    const count = json.data?.[resource]?.nodes?.length ?? 0;
    const hasError = json.errors?.length > 0;
    console.log(`${resource}: ${hasError ? 'ERROR - ' + json.errors[0].message : count + ' results'}`);
  }
}

test().catch(console.error);