-- Run in Supabase SQL editor.
-- Adds the composite indexes every fact-table query on the dashboard + sync
-- relies on. Safe to re-run (IF NOT EXISTS). No data rewritten.

-- connection_id is always filtered; secondary sorts are by status/date.
CREATE INDEX IF NOT EXISTS fact_jobs_connection_status_idx
  ON fact_jobs (connection_id, status);
CREATE INDEX IF NOT EXISTS fact_jobs_connection_updated_idx
  ON fact_jobs (connection_id, updated_at_jobber DESC);
CREATE INDEX IF NOT EXISTS fact_jobs_connection_scheduled_idx
  ON fact_jobs (connection_id, scheduled_start_at);

CREATE INDEX IF NOT EXISTS fact_invoices_connection_status_idx
  ON fact_invoices (connection_id, status);
CREATE INDEX IF NOT EXISTS fact_invoices_connection_due_idx
  ON fact_invoices (connection_id, due_at);
CREATE INDEX IF NOT EXISTS fact_invoices_connection_updated_idx
  ON fact_invoices (connection_id, updated_at_jobber DESC);

CREATE INDEX IF NOT EXISTS fact_quotes_connection_status_idx
  ON fact_quotes (connection_id, quote_status);
CREATE INDEX IF NOT EXISTS fact_quotes_connection_sent_idx
  ON fact_quotes (connection_id, sent_at);
CREATE INDEX IF NOT EXISTS fact_quotes_connection_updated_idx
  ON fact_quotes (connection_id, updated_at_jobber DESC);

CREATE INDEX IF NOT EXISTS fact_visits_connection_start_idx
  ON fact_visits (connection_id, start_at);
CREATE INDEX IF NOT EXISTS fact_visits_connection_complete_idx
  ON fact_visits (connection_id, is_complete);

CREATE INDEX IF NOT EXISTS fact_requests_connection_status_idx
  ON fact_requests (connection_id, request_status);
CREATE INDEX IF NOT EXISTS fact_requests_connection_created_idx
  ON fact_requests (connection_id, created_at_jobber DESC);

-- Stripe dedup lookup is single-row PK; analytics events filtered by connection.
CREATE INDEX IF NOT EXISTS analytics_events_connection_created_idx
  ON analytics_events (connection_id, created_at DESC);
