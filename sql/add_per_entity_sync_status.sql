-- Run in Supabase SQL editor.
-- Adds per-entity sync status + counts so the /jobber/syncing onboarding
-- page can show progress bars per entity (jobs/visits/quotes/invoices/requests).

ALTER TABLE jobber_connections
  ADD COLUMN IF NOT EXISTS sync_status_jobs     TEXT,
  ADD COLUMN IF NOT EXISTS sync_status_visits   TEXT,
  ADD COLUMN IF NOT EXISTS sync_status_quotes   TEXT,
  ADD COLUMN IF NOT EXISTS sync_status_invoices TEXT,
  ADD COLUMN IF NOT EXISTS sync_status_requests TEXT,
  ADD COLUMN IF NOT EXISTS sync_count_jobs      INTEGER,
  ADD COLUMN IF NOT EXISTS sync_count_visits    INTEGER,
  ADD COLUMN IF NOT EXISTS sync_count_quotes    INTEGER,
  ADD COLUMN IF NOT EXISTS sync_count_invoices  INTEGER,
  ADD COLUMN IF NOT EXISTS sync_count_requests  INTEGER;
