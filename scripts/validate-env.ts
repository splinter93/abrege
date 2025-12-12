#!/usr/bin/env tsx
/**
 * Validation des variables d'environnement requises
 * Charge .env.local puis .env avant d'importer la config stricte.
 */
import { config as loadEnv } from 'dotenv';

// Charger .env.local en priorité, puis .env
loadEnv({ path: '.env.local' });
loadEnv();

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY'
] as const;

const missing = requiredEnvVars.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error('[ENV VALIDATION] Missing variables:', missing);
  console.error('Sample values:', {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 24) + '...' || 'absent',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    AWS_S3_BUCKET: process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'absent',
    AWS_REGION: process.env.S3_REGION || process.env.AWS_REGION || 'absent'
  });
  process.exit(1);
}

(async () => {
  const { ENV } = await import('../src/config/env');
  const { SERVER_ENV } = await import('../src/config/env.server');

  console.log('Validating environment variables...');
  console.log('Supabase URL:', ENV.supabase.url.substring(0, 20) + '...');
  console.log('Supabase anon key present:', !!ENV.supabase.anonKey);
  console.log('Supabase service role prefix:', SERVER_ENV.supabase.serviceRoleKey.substring(0, 4) + '***');
  console.log('AWS S3 Bucket:', SERVER_ENV.aws.s3BucketName);
  console.log('Environment:', SERVER_ENV.nodeEnv);
  console.log('✅ All required environment variables are present');
})();
