-- Run in Supabase SQL editor.
-- Tracks Stripe webhook event IDs so retries are processed exactly once.
-- PK on event_id gives us a fast, atomic dedup: if the insert fails we've
-- already seen it. Old rows pruned on a nightly cron; 90 days is plenty.

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id   TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_received_at_idx
  ON stripe_webhook_events (received_at);
