/**
 * Configuration centralisée des variables d'environnement
 * Validation au démarrage pour fail-fast
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY'
] as const;

const optionalEnvVars = {
  NODE_ENV: 'development'
} as const;

const isServer = typeof window === 'undefined';

const resolveEnv = (primary: string, fallbacks: string[], label: string): string => {
  if (!isServer) {
    // Ne valide pas côté client (process.env vide dans le bundle)
    return '';
  }
  const value = [primary, ...fallbacks].map((key) => process.env[key]).find(Boolean);
  if (!value) {
    throw new Error(`[ENV] Missing required environment variable: ${label} (tried ${[primary, ...fallbacks].join(', ')})`);
  }
  return value;
};

if (isServer) {
  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      throw new Error(`[ENV] Missing required environment variable: ${key}`);
    }
  }
}

export const ENV = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    s3BucketName: resolveEnv('S3_BUCKET_NAME', ['AWS_S3_BUCKET'], 'S3 bucket name'),
    s3Region: resolveEnv('S3_REGION', ['AWS_REGION'], 'S3 region')
  },
  nodeEnv: process.env.NODE_ENV || optionalEnvVars.NODE_ENV,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
} as const;

export type EnvConfig = typeof ENV;
