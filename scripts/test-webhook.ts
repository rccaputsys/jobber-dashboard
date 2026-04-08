// scripts/test-webhook.ts
//
// Simulate a Jobber webhook POST against a running dev server. Computes the
// HMAC-SHA256 signature using JOBBER_CLIENT_SECRET so the request passes
// signature verification in src/app/api/webhooks/route.ts.
//
// Usage:
//   npx tsx scripts/test-webhook.ts <TOPIC> <JOBBER_ACCOUNT_ID> <ENTITY_ID>
//
// Example:
//   npx tsx scripts/test-webhook.ts JOB_UPDATE Z2lkOi8v...account... Z2lkOi8v...job...
//
// The account ID must match the jobber_account_id of an existing
// jobber_connections row, otherwise the dispatcher will log "unknown account"
// and exit early. Find it with:
//   select id, jobber_account_id, jobber_account_name from jobber_connections;
//
// Env vars:
//   JOBBER_CLIENT_SECRET — same secret used by the running dev server
//   WEBHOOK_URL          — defaults to http://localhost:3000/api/webhooks

import { createHmac } from 'crypto';

const [, , topic, accountId, entityId] = process.argv;

if (!topic || !accountId || !entityId) {
  console.error('Usage: tsx scripts/test-webhook.ts <TOPIC> <ACCOUNT_ID> <ENTITY_ID>');
  process.exit(1);
}

const secret = process.env.JOBBER_CLIENT_SECRET;
if (!secret) {
  console.error('JOBBER_CLIENT_SECRET env var is required');
  process.exit(1);
}

const url = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks';

// Mimic Jobber's webhook payload shape. The dispatcher reads:
//   webhookData.topic
//   webhookData.accountId
//   webhookData.itemId
const payload = {
  data: {
    webHookEvent: {
      topic,
      accountId,
      itemId: entityId,
      occuredAt: new Date().toISOString(),
    },
  },
};

const rawBody = JSON.stringify(payload);
const signature = createHmac('sha256', secret).update(rawBody).digest('base64');

(async () => {
  console.log(`POST ${url}`);
  console.log(`  topic:     ${topic}`);
  console.log(`  accountId: ${accountId}`);
  console.log(`  entityId:  ${entityId}`);
  console.log('');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-jobber-hmac-sha256': signature,
    },
    body: rawBody,
  });

  const text = await res.text();
  console.log(`HTTP ${res.status}`);
  console.log(text);

  if (res.status !== 200) {
    process.exit(1);
  }
})().catch((err) => {
  console.error('Request failed:', err);
  process.exit(1);
});
