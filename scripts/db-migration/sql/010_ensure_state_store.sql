-- Ensure JSON state store table exists for runtime keys
CREATE TABLE IF NOT EXISTS credverse_state_store (
  service_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credverse_state_store_updated_at
  ON credverse_state_store (updated_at DESC);
