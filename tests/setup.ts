// tests/setup.ts
// Global test setup for Vitest

// Set required env vars for tests (use dummy values — nothing hits real services)
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.APP_ENCRYPTION_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.JOBBER_CLIENT_ID = "test-client-id";
process.env.JOBBER_CLIENT_SECRET = "test-client-secret";
process.env.JOBBER_REDIRECT_URI = "http://localhost:3000/api/jobber/callback";
process.env.JOBBER_OAUTH_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";
process.env.JOBBER_GRAPHQL_URL = "https://api.getjobber.com/api/graphql";
process.env.JOBBER_GRAPHQL_VERSION = "2025-04-16";
process.env.STRIPE_SECRET_KEY = "sk_test_fake";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_fake";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
