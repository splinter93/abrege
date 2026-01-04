/**
 * Configuration serveur (secrets non exposés au client)
 * ⚠️ Doit être importée uniquement côté serveur.
 */

// Hard guard to prevent accidental client bundling
if (typeof window !== 'undefined') {
  throw new Error('[ENV_SERVER] Imported on client - forbidden');
}

const requiredServerEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY'
] as const;

const optionalServerEnvVars = {
  NODE_ENV: 'development',
  GROQ_API_KEY: '',
  OPENAI_API_KEY: '',
  XAI_API_KEY: '',
  WHISPER_API_URL: '',
  REDIS_URL: ''
} as const;

const resolveEnv = (primary: string, fallbacks: string[], label: string): string => {
  const value = [primary, ...fallbacks].map((key) => process.env[key]).find(Boolean);
  if (!value) {
    throw new Error(`[ENV_SERVER] Missing required environment variable: ${label} (tried ${[primary, ...fallbacks].join(', ')})`);
  }
  return value;
};

for (const key of requiredServerEnvVars) {
  if (!process.env[key]) {
    throw new Error(`[ENV_SERVER] Missing required environment variable: ${key}`);
  }
}

export const SERVER_ENV = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    s3BucketName: resolveEnv('S3_BUCKET_NAME', ['AWS_S3_BUCKET'], 'S3 bucket name'),
    s3Region: resolveEnv('S3_REGION', ['AWS_REGION'], 'S3 region')
  },
  llm: {
    groqApiKey: process.env.GROQ_API_KEY || optionalServerEnvVars.GROQ_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY || optionalServerEnvVars.OPENAI_API_KEY,
    xaiApiKey: process.env.XAI_API_KEY || optionalServerEnvVars.XAI_API_KEY,
    liminalityApiKey: process.env.LIMINALITY_API_KEY || ''
  },
  services: {
    whisperApiUrl: process.env.WHISPER_API_URL || optionalServerEnvVars.WHISPER_API_URL,
    redisUrl: process.env.REDIS_URL || optionalServerEnvVars.REDIS_URL
  },
  xaiVoiceProxy: {
    port: parseInt(process.env.XAI_VOICE_PROXY_PORT || '3001', 10)
  },
  nodeEnv: process.env.NODE_ENV || optionalServerEnvVars.NODE_ENV,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
} as const;

export type ServerEnvConfig = typeof SERVER_ENV;






