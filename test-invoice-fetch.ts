// test-invoice-fetch.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  const { getValidAccessToken } = await import('./src/lib/jobberAuth');
  
  const connectionId = '477ad612-6a40-485e-b71d-1799f13c613a';
  const token = await getValidAccessToken(connectionId);

  const query = `query {
    invoices(first: 3) {
      nodes {
        id
        invoiceNumber
        invoiceStatus
        total
        amounts {
          subtotal
          total
          depositAmount
          discountAmount
          invoiceBalance
          paymentsTotal
          tipsTotal
        }
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
  console.log(JSON.stringify(json, null, 2));
}

test().catch(console.error);