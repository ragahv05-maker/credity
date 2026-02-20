-- Template: replace table/column names with deterministic business key checks.
-- Example:
-- SELECT md5(string_agg(id::text, ',' ORDER BY id)) AS checksum_users FROM public.users;

-- Wallet examples (edit as needed):
-- SELECT md5(string_agg(id::text, ',' ORDER BY id)) AS checksum_wallet_users FROM wallet.users;
-- SELECT md5(string_agg(id::text, ',' ORDER BY id)) AS checksum_wallet_credentials FROM wallet.credentials;

-- Issuer examples:
-- SELECT md5(string_agg(id::text, ',' ORDER BY id)) AS checksum_issuer_users FROM issuer.users;
-- SELECT md5(string_agg(id::text, ',' ORDER BY id)) AS checksum_issuer_credentials FROM issuer.credentials;

-- Recruiter examples:
-- SELECT md5(string_agg(id::text, ',' ORDER BY id)) AS checksum_recruiter_users FROM recruiter.users;
