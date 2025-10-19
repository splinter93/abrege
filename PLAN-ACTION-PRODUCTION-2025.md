# 🚀 PLAN D'ACTION POUR LA PRODUCTION - SCRIVIA/ABRÈGE

## 📋 **ROADMAP DÉTAILLÉE**

Ce document complète l'audit global avec des **actions concrètes**, **exemples de code**, et **scripts d'automatisation**.

---

## 🔴 **PHASE 1: CORRECTIONS CRITIQUES (Jours 1-5)**

### 1.1 - Activation TypeScript Strict Mode

#### Étape 1: Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,                    // ✅ Activer strict
    "noUncheckedIndexedAccess": true,  // ✅ Sécurité supplémentaire
    "noImplicitReturns": true,         // ✅ Retours explicites
    "noFallthroughCasesInSwitch": true,// ✅ Switch statements sûrs
    "allowJs": false,                  // ✅ Forcer TypeScript uniquement
  }
}
```

```typescript
// next.config.ts
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,  // ✅ Ne plus ignorer les erreurs
  },
  eslint: {
    ignoreDuringBuilds: false,  // ✅ Ne plus ignorer ESLint
  }
};
```

#### Étape 2: Script de Migration Automatique
```typescript
// scripts/fix-any-types.ts
import { Project } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: './tsconfig.json',
});

// Trouver tous les 'any' explicites
const sourceFiles = project.getSourceFiles('src/**/*.ts');
let fixes = 0;

for (const sourceFile of sourceFiles) {
  const anyNodes = sourceFile.getDescendantsOfKind(SyntaxKind.AnyKeyword);
  
  for (const anyNode of anyNodes) {
    const parent = anyNode.getParent();
    
    // Remplacer 'any' par 'unknown' pour forcer la vérification
    if (parent) {
      parent.replaceWithText(parent.getText().replace('any', 'unknown'));
      fixes++;
    }
  }
  
  sourceFile.saveSync();
}

console.log(`✅ Fixed ${fixes} 'any' types`);
```

#### Étape 3: Correction Progressive
```bash
# 1. Compiler et voir les erreurs
npm run audit

# 2. Corriger les fichiers critiques en priorité
# - src/utils/authUtils.ts
# - src/utils/v2ValidationSchemas.ts
# - src/services/apiKeyService.ts
# - src/app/api/v2/note/create/route.ts

# 3. Corriger par lot avec des patterns communs
npx ts-migrate reignore src/
```

#### Corrections Communes

**Avant:**
```typescript
function handleData(data: any) {  // ❌
  return data.value;
}
```

**Après:**
```typescript
interface DataInput {
  value: string;
  metadata?: Record<string, unknown>;
}

function handleData(data: DataInput): string {  // ✅
  return data.value;
}
```

---

### 1.2 - Création Suite de Tests

#### Structure de Tests
```
src/
├── __tests__/
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── authUtils.test.ts
│   │   │   ├── validation.test.ts
│   │   │   └── markdownSanitizer.test.ts
│   │   └── services/
│   │       ├── apiKeyService.test.ts
│   │       └── chatSessionService.test.ts
│   ├── integration/
│   │   ├── api/
│   │   │   ├── note-creation.test.ts
│   │   │   ├── authentication.test.ts
│   │   │   └── file-upload.test.ts
│   └── e2e/
│       ├── note-lifecycle.test.ts
│       └── sharing-flow.test.ts
```

#### Test Suite - Authentication
```typescript
// src/__tests__/unit/utils/authUtils.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getAuthenticatedUser, validateApiKey } from '@/utils/authUtils';
import { NextRequest } from 'next/server';

describe('authUtils', () => {
  describe('getAuthenticatedUser', () => {
    it('should authenticate with valid API key', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'X-API-Key': 'scrivia_test_key_123'
        }
      });

      const result = await getAuthenticatedUser(request);

      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();
      expect(result.authType).toBe('api_key');
    });

    it('should reject invalid API key', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'X-API-Key': 'invalid_key'
        }
      });

      const result = await getAuthenticatedUser(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Clé API invalide');
    });

    it('should authenticate with JWT token', async () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });

      const result = await getAuthenticatedUser(request);

      expect(result.success).toBe(true);
      expect(result.authType).toBe('jwt');
    });

    it('should reject missing authentication', async () => {
      const request = new NextRequest('http://localhost/api/test');

      const result = await getAuthenticatedUser(request);

      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
    });
  });

  describe('validateApiKey', () => {
    it('should validate non-expired API key', async () => {
      const apiKey = 'scrivia_test_key_123';
      
      const result = await validateApiKey(apiKey);

      expect(result).toBeDefined();
      expect(result.user_id).toBeDefined();
      expect(result.scopes).toContain('notes:read');
    });

    it('should reject expired API key', async () => {
      const expiredKey = 'scrivia_expired_key_123';
      
      const result = await validateApiKey(expiredKey);

      expect(result).toBeNull();
    });
  });
});
```

#### Test Suite - API Endpoints
```typescript
// src/__tests__/integration/api/note-creation.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createMockRequest, createTestUser } from '@/test-utils/helpers';

describe('POST /api/v2/note/create', () => {
  let authToken: string;
  let testUserId: string;
  let testClasseurId: string;

  beforeAll(async () => {
    const user = await createTestUser();
    authToken = user.token;
    testUserId = user.id;
    testClasseurId = user.defaultClasseurId;
  });

  it('should create note with valid data', async () => {
    const response = await fetch('http://localhost:3000/api/v2/note/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source_title: 'Test Note',
        notebook_id: testClasseurId,
        markdown_content: '# Hello World\n\nThis is a test.'
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.note).toBeDefined();
    expect(data.note.id).toBeDefined();
    expect(data.note.source_title).toBe('Test Note');
  });

  it('should reject note creation without authentication', async () => {
    const response = await fetch('http://localhost:3000/api/v2/note/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source_title: 'Test Note',
        notebook_id: testClasseurId,
        markdown_content: '# Test'
      })
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('should reject note with invalid markdown', async () => {
    const response = await fetch('http://localhost:3000/api/v2/note/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source_title: 'Malicious Note',
        notebook_id: testClasseurId,
        markdown_content: '<script>alert("XSS")</script>'
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    // Le markdown doit être sanitizé
    expect(data.note.markdown_content).not.toContain('<script>');
  });

  it('should validate required fields', async () => {
    const response = await fetch('http://localhost:3000/api/v2/note/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Missing source_title
        notebook_id: testClasseurId
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});
```

#### Configuration Vitest
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-utils/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-utils/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

### 1.3 - Suppression des console.log

#### Script Automatique
```typescript
// scripts/remove-console-logs.ts
import { Project, SyntaxKind } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: './tsconfig.json',
});

const sourceFiles = project.getSourceFiles('src/**/*.{ts,tsx}');
let removedCount = 0;

for (const sourceFile of sourceFiles) {
  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  
  for (const callExpr of callExpressions) {
    const expression = callExpr.getExpression();
    
    if (expression.getText().match(/console\.(log|warn|error|info|debug)/)) {
      // Remplacer par logger approprié
      const method = expression.getText().split('.')[1];
      const args = callExpr.getArguments().map(arg => arg.getText()).join(', ');
      
      // Déterminer le logger à utiliser
      let loggerCall = '';
      if (sourceFile.getFilePath().includes('/api/')) {
        loggerCall = `logApi.${method === 'log' ? 'info' : method}(${args})`;
      } else {
        loggerCall = `logger.${method === 'log' ? 'info' : method}(${args})`;
      }
      
      callExpr.replaceWithText(loggerCall);
      removedCount++;
    }
  }
  
  // Ajouter l'import du logger si nécessaire
  if (removedCount > 0) {
    const hasLoggerImport = sourceFile.getImportDeclaration('@/utils/logger');
    if (!hasLoggerImport) {
      sourceFile.addImportDeclaration({
        moduleSpecifier: '@/utils/logger',
        namedImports: sourceFile.getFilePath().includes('/api/') 
          ? ['logApi'] 
          : ['logger']
      });
    }
  }
  
  sourceFile.saveSync();
}

console.log(`✅ Removed/replaced ${removedCount} console.* calls`);
```

#### Configuration Logger pour Production
```typescript
// src/utils/logger.ts
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEV = process.env.NODE_ENV === 'development';

export const logger = {
  info: (...args: unknown[]) => {
    if (!IS_PRODUCTION) {
      console.info('[INFO]', ...args);
    }
    // En production, envoyer à un service externe (Sentry, Datadog, etc.)
    if (IS_PRODUCTION) {
      sendToMonitoring('info', args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (!IS_PRODUCTION) {
      console.warn('[WARN]', ...args);
    }
    if (IS_PRODUCTION) {
      sendToMonitoring('warn', args);
    }
  },
  
  error: (...args: unknown[]) => {
    // Toujours logger les erreurs, même en prod
    console.error('[ERROR]', ...args);
    if (IS_PRODUCTION) {
      sendToMonitoring('error', args);
    }
  },
  
  dev: (...args: unknown[]) => {
    // Seulement en développement
    if (IS_DEV) {
      console.log('[DEV]', ...args);
    }
  }
};

function sendToMonitoring(level: string, args: unknown[]) {
  // Implémenter l'envoi vers Sentry, Datadog, etc.
  // TODO: À implémenter
}
```

---

### 1.4 - Rate Limiting Global

#### Implémentation Middleware
```typescript
// src/middleware-utils/globalRateLimit.ts
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface RateLimitConfig {
  interval: number; // en ms
  limit: number; // nombre de requêtes
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Endpoints publics (restrictif)
  'public': { interval: 60000, limit: 30 },  // 30 req/min
  
  // Endpoints API (standard)
  'api': { interval: 60000, limit: 100 },  // 100 req/min
  
  // Endpoints chat LLM (généreux)
  'chat': { interval: 60000, limit: 50 },  // 50 req/min
  
  // Endpoints auth (très restrictif)
  'auth': { interval: 60000, limit: 10 },  // 10 req/min
};

export async function rateLimit(
  request: NextRequest,
  config?: RateLimitConfig
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  
  // Déterminer la configuration selon la route
  const pathname = request.nextUrl.pathname;
  let rateLimitConfig: RateLimitConfig;
  
  if (pathname.startsWith('/api/auth')) {
    rateLimitConfig = RATE_LIMITS.auth;
  } else if (pathname.startsWith('/api/chat')) {
    rateLimitConfig = RATE_LIMITS.chat;
  } else if (pathname.startsWith('/api')) {
    rateLimitConfig = RATE_LIMITS.api;
  } else {
    rateLimitConfig = RATE_LIMITS.public;
  }
  
  // Override si config personnalisée fournie
  if (config) {
    rateLimitConfig = config;
  }
  
  // Identifier l'utilisateur (IP + userId si authentifié)
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const userId = request.headers.get('x-user-id') || 'anonymous';
  const identifier = `${ip}:${userId}`;
  
  const key = `ratelimit:${pathname}:${identifier}`;
  const now = Date.now();
  const windowStart = now - rateLimitConfig.interval;
  
  try {
    // Utiliser Redis sorted set pour track les requêtes
    const multi = redis.multi();
    
    // Supprimer les entrées expirées
    multi.zremrangebyscore(key, 0, windowStart);
    
    // Ajouter la requête actuelle
    multi.zadd(key, { score: now, member: `${now}:${Math.random()}` });
    
    // Compter les requêtes dans la fenêtre
    multi.zcard(key);
    
    // Expirer la clé après l'interval
    multi.expire(key, Math.ceil(rateLimitConfig.interval / 1000));
    
    const results = await multi.exec();
    const count = results[2] as number;
    
    const remaining = Math.max(0, rateLimitConfig.limit - count);
    const reset = now + rateLimitConfig.interval;
    
    if (count > rateLimitConfig.limit) {
      return {
        success: false,
        limit: rateLimitConfig.limit,
        remaining: 0,
        reset,
      };
    }
    
    return {
      success: true,
      limit: rateLimitConfig.limit,
      remaining,
      reset,
    };
  } catch (error) {
    // En cas d'erreur Redis, permettre la requête (fail open)
    console.error('Rate limit error:', error);
    return {
      success: true,
      limit: rateLimitConfig.limit,
      remaining: rateLimitConfig.limit,
      reset: now + rateLimitConfig.interval,
    };
  }
}

// Middleware factory pour ajouter rate limiting à un endpoint
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const result = await rateLimit(req, config);
    
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Trop de requêtes',
          message: 'Vous avez dépassé la limite de requêtes. Veuillez réessayer plus tard.',
          limit: result.limit,
          retry_after: Math.ceil((result.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }
    
    const response = await handler(req);
    
    // Ajouter les headers de rate limit à toutes les réponses
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.reset.toString());
    
    return response;
  };
}
```

#### Utilisation sur les Endpoints
```typescript
// src/app/api/v2/note/create/route.ts
import { withRateLimit } from '@/middleware-utils/globalRateLimit';

async function handler(request: NextRequest): Promise<NextResponse> {
  // Logique existante...
}

export const POST = withRateLimit(handler, {
  interval: 60000, // 1 minute
  limit: 50, // 50 créations de notes par minute max
});
```

---

## 🟡 **PHASE 2: STABILISATION (Jours 6-10)**

### 2.1 - CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20.x'

jobs:
  # Job 1: Linting & Type Checking
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run ESLint
        run: npm run lint
        
      - name: Run TypeScript check
        run: npx tsc --noEmit
        
      - name: Check for console.log
        run: |
          if grep -r "console\.log" src/; then
            echo "❌ console.log found in source code"
            exit 1
          fi

  # Job 2: Tests
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    needs: lint
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm test -- --run --reporter=verbose
        
      - name: Generate coverage
        run: npm run test:coverage
        
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
          
      - name: Check coverage thresholds
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 70" | bc -l) )); then
            echo "❌ Coverage is below 70%: $COVERAGE%"
            exit 1
          fi

  # Job 3: Security Audit
  security:
    name: Security Audit
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Run npm audit
        run: npm audit --audit-level=high
        
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  # Job 4: Build
  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: [lint, test]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          
      - name: Analyze bundle size
        run: |
          npm run build -- --json > build-stats.json
          # TODO: Ajouter une vérification de la taille du bundle

  # Job 5: Deploy to Vercel (only on main)
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [lint, test, security, build]
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          
      - name: Comment PR with deployment URL
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Deployment successful! [View deployment](${{ steps.deploy.outputs.url }})'
            })
```

---

### 2.2 - Monitoring & Alertes

#### Configuration Sentry
```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Environnement
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Error Sampling
  sampleRate: 1.0,
  
  // Ignorer certaines erreurs
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],
  
  // Avant d'envoyer l'événement
  beforeSend(event, hint) {
    // Filtrer les données sensibles
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.['authorization'];
      delete event.request.headers?.['x-api-key'];
    }
    
    // Ne pas envoyer les erreurs de dev
    if (event.environment === 'development') {
      return null;
    }
    
    return event;
  },
  
  // Intégrations
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Postgres(),
  ],
});
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  environment: process.env.NODE_ENV,
  
  // Replay Sessions pour débugger les erreurs visuelles
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

#### Wrapper d'Erreur pour les API Routes
```typescript
// src/utils/apiErrorHandler.ts
import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';

export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  context: { operation: string; component: string }
): T {
  return (async (...args: Parameters<T>): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    const startTime = Date.now();
    
    try {
      const response = await handler(...args);
      
      // Logger les métriques
      const duration = Date.now() - startTime;
      logApi.info(`✅ ${context.operation} completed in ${duration}ms`, context);
      
      return response;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Logger l'erreur
      logApi.error(`❌ ${context.operation} failed after ${duration}ms`, {
        ...context,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Envoyer à Sentry avec contexte enrichi
      Sentry.withScope((scope) => {
        scope.setContext('operation', context);
        scope.setContext('request', {
          url: request.url,
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
        });
        scope.setTag('operation', context.operation);
        scope.setTag('component', context.component);
        
        Sentry.captureException(error);
      });
      
      // Retourner une erreur structurée
      return NextResponse.json(
        {
          error: 'Erreur interne du serveur',
          message: process.env.NODE_ENV === 'development' 
            ? error instanceof Error ? error.message : String(error)
            : 'Une erreur est survenue',
          operation: context.operation,
          request_id: crypto.randomUUID(),
        },
        { status: 500 }
      );
    }
  }) as T;
}
```

#### Utilisation
```typescript
// src/app/api/v2/note/create/route.ts
import { withErrorHandler } from '@/utils/apiErrorHandler';

async function createNoteHandler(request: NextRequest): Promise<NextResponse> {
  // Logique de création...
}

export const POST = withErrorHandler(createNoteHandler, {
  operation: 'v2_note_create',
  component: 'API_V2',
});
```

---

### 2.3 - Feature Flags

```typescript
// src/lib/featureFlags.ts
import { createClient } from '@vercel/edge-config';

const edgeConfig = createClient(process.env.EDGE_CONFIG);

export interface FeatureFlags {
  enableNewEditor: boolean;
  enableAIFeatures: boolean;
  enableCollaboration: boolean;
  maintenanceMode: boolean;
  rateLimitMultiplier: number;
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  try {
    const flags = await edgeConfig.getAll<FeatureFlags>();
    
    return {
      enableNewEditor: flags?.enableNewEditor ?? false,
      enableAIFeatures: flags?.enableAIFeatures ?? true,
      enableCollaboration: flags?.enableCollaboration ?? false,
      maintenanceMode: flags?.maintenanceMode ?? false,
      rateLimitMultiplier: flags?.rateLimitMultiplier ?? 1.0,
    };
  } catch (error) {
    // Fallback en cas d'erreur Edge Config
    return {
      enableNewEditor: false,
      enableAIFeatures: true,
      enableCollaboration: false,
      maintenanceMode: false,
      rateLimitMultiplier: 1.0,
    };
  }
}

export async function isFeatureEnabled(flag: keyof FeatureFlags): Promise<boolean> {
  const flags = await getFeatureFlags();
  return Boolean(flags[flag]);
}
```

---

## 📊 **MÉTRIQUES DE SUCCÈS**

### Avant Corrections
```
TypeScript Errors:     ~300 (estimé)
Test Coverage:         0%
Console.log:           564 occurrences
Rate Limiting:         Partiel
Monitoring:            Absent
CI/CD:                 Absent
Production Ready:      ❌ NON
```

### Après Phase 1 (Jour 5)
```
TypeScript Errors:     0
Test Coverage:         50%+
Console.log:           0 (remplacé par logger)
Rate Limiting:         ✅ Global
Monitoring:            Basique
CI/CD:                 Absent
Production Ready:      ⚠️ PRESQUE
```

### Après Phase 2 (Jour 10)
```
TypeScript Errors:     0
Test Coverage:         70%+
Console.log:           0
Rate Limiting:         ✅ Global + Par endpoint
Monitoring:            ✅ Complet (Sentry + Vercel)
CI/CD:                 ✅ GitHub Actions
Production Ready:      ✅ OUI
```

---

## ✅ **CHECKLIST DE DÉPLOIEMENT**

### Pre-Deployment
- [ ] Tous les tests passent (npm test)
- [ ] Couverture de tests ≥ 70%
- [ ] Build réussit sans erreurs (npm run build)
- [ ] TypeScript strict activé et 0 erreur
- [ ] Aucun console.log dans le code
- [ ] Variables d'environnement configurées
- [ ] Rate limiting testé
- [ ] Sentry configuré et testé

### Deployment
- [ ] Déployer sur environnement de staging
- [ ] Tests E2E sur staging
- [ ] Tests de charge (k6/Artillery)
- [ ] Validation des feature flags
- [ ] Backup de la base de données
- [ ] Migration de base de données (si nécessaire)
- [ ] Déploiement en production
- [ ] Smoke tests post-déploiement

### Post-Deployment
- [ ] Monitoring actif et alertes configurées
- [ ] Vérifier les logs Sentry
- [ ] Vérifier les métriques Vercel
- [ ] Tester les endpoints critiques
- [ ] Documenter le déploiement
- [ ] Communiquer aux utilisateurs

---

**Document créé le:** 18 Octobre 2025  
**Estimation totale:** 10 jours de travail focalisé  
**Prochaine révision:** Après Phase 1 (Jour 5)

