process.env.NODE_ENV ??= "test";
process.env.JWT_SECRET ??= "test_jwt_secret_credity_issuer_32_chars_min";
process.env.JWT_REFRESH_SECRET ??= "test_refresh_secret_credity_issuer_32_min";
process.env.ISSUER_KEY_ENCRYPTION ??=
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
