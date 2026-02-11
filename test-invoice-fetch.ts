// test-user-sync.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  const { getValidAccessToken } = await import('./src/lib/jobberAuth');
  
  const connectionId = 'f936e5ae-1a87-45b7-bc16-f0089dac7efa';
  const token = await getValidAccessToken(connectionId);

  const resources = ['jobs', 'invoices', 'quotes', 'requests'];
  
  for (const resource of resources) {
    const query = `query {
      ${resource}(first: 5) {
        nodes {
          id
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
    
    if (hasError) {
      console.log('  Full error:', JSON.stringify(json.errors, null, 2));
    }
  }
}

test().catch(console.error);