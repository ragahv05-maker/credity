-- Ensure expected state-store service keys exist
WITH expected(service_key) AS (
  VALUES
    ('wallet-storage'),
    ('issuer-storage'),
    ('recruiter-storage'),
    ('issuer-queue-runtime'),
    ('issuer-status-list'),
    ('issuer-anchor-batches'),
    ('issuer-compliance'),
    ('issuer-oid4vci-runtime'),
    ('issuer-digilocker-user-pull-state'),
    ('recruiter-compliance'),
    ('recruiter-oid4vp-requests'),
    ('recruiter-verification-engine')
)
SELECT
  e.service_key,
  (s.service_key IS NOT NULL) AS present,
  s.updated_at
FROM expected e
LEFT JOIN credverse_state_store s USING (service_key)
ORDER BY e.service_key;
