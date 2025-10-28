# GUIDE D'EXCELLENCE - SCRIVIA CHAT

> **Code pour 1M+ utilisateurs. Chaque ligne compte.**

---

## CONTEXTE

**Qui :** Startup ambitieuse, équipe lean 2-3 devs  
**Ambition :** Millions d'utilisateurs, rival ChatGPT/Claude  
**Approche :** MVP pragmatiques, ZÉRO compromis fondamentaux  
**Standard :** Niveau GAFAM

**Ce guide = Bible technique**  
Chaque règle évite un bug en prod à scale.

---

## TYPESCRIPT STRICT

### Interdictions absolues
```
❌ any (implicite ou explicite)
❌ @ts-ignore, @ts-expect-error
❌ Type assertions injustifiées (as)
❌ Optional chaining masquant bugs (?.)
```

### Obligatoire
```
✅ Interfaces explicites pour TOUS objets
✅ Type guards pour unions
✅ Validation Zod inputs API/DB
✅ Generics pour réutilisabilité
✅ Utility types (Omit, Pick, NonNullable)
```

### Pattern
```typescript
interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
}

function isAssistantMessage(m: Message): m is Message & { role: 'assistant' } {
  return m.role === 'assistant';
}
```

### Exceptions rares
```
⚠️ any acceptable UNIQUEMENT si :
- API externe non typée
- Aucune alternative possible
- Commentaire expliquant pourquoi
- Plan pour typer plus tard

// Exemple acceptable
const externalData: any = await untypedAPI(); // TODO: Type when API docs available
```

---

## ARCHITECTURE

### Structure imposée
```
src/features/[feature]/
  components/    # UI uniquement, < 200 lignes
  hooks/         # Logique métier réutilisable
  services/      # API/DB, singleton si stateful
  types/         # Types TS dédiés
  utils/         # Helpers purs
  tests/         # Tests colocalisés
```

### Règles
```
✅ 1 fichier = 1 responsabilité
✅ Max 300 lignes par fichier (strict)
✅ Dépendances unidirectionnelles (pas de cycles)
✅ Exports explicites uniquement
```

### Séparation responsabilités
```
COMPOSANTS REACT
→ Affichage uniquement
→ Pas de logique métier
→ Props typées strictement

HOOKS
→ Logique métier réutilisable
→ State local
→ Side effects

SERVICES
→ API/DB calls
→ Gestion erreurs robuste
→ Retry logic
→ Singleton si stateful
```

---

## DATABASE & PERSISTENCE

### Règles critiques
```
❌ JAMAIS
- Collections JSONB (thread, messages, etc.)
- Updates non-atomiques
- Absence sequence_number
- Requêtes sans WHERE indexé

✅ TOUJOURS
- 1 table par collection
- sequence_number + UNIQUE(session_id, sequence_number)
- Indexes sur colonnes filtrage
- TIMESTAMPTZ (pas BIGINT)
- Transactions multi-opérations
```

### Pattern atomicité
```sql
-- Récupérer dernier sequence_number
SELECT sequence_number 
FROM messages 
WHERE session_id = $1 
ORDER BY sequence_number DESC 
LIMIT 1;

-- Insérer avec sequence_number suivant
INSERT INTO messages (session_id, sequence_number, content)
VALUES ($1, $2 + 1, $3);

-- UNIQUE constraint garantit pas de doublons
ALTER TABLE messages 
ADD CONSTRAINT unique_session_sequence 
UNIQUE(session_id, sequence_number);
```

---

## CONCURRENCY & IDEMPOTENCE

### Prévention race conditions
```
✅ OBLIGATOIRE
- operation_id unique par requête
- tool_call_id unique par tool call
- Déduplication côté serveur
- Queue exclusive par ressource
- UNIQUE constraints DB
```

### Pattern runExclusive
```typescript
class Service {
  private queues = new Map<string, Promise<unknown>>();
  
  async runExclusive<T>(id: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.queues.get(id) || Promise.resolve();
    let resolve: (v: unknown) => void;
    const next = new Promise(r => (resolve = r));
    this.queues.set(id, prev.then(() => next));
    
    try {
      return await fn();
    } finally {
      resolve!(null);
    }
  }
}
```

---

## ERROR HANDLING

### Pattern 3 niveaux
```typescript
// 1. CATCH SPÉCIFIQUE
try {
  await op();
} catch (error) {
  if (error instanceof NetworkError) {
    return retry(op, { maxRetries: 3 });
  }
  if (error instanceof ValidationError) {
    return { success: false, error: error.message };
  }
  throw error;
}

// 2. FALLBACK GRACIEUX
async function load() {
  try {
    return await db.get();
  } catch (error) {
    logger.error('[Load] Failed', { error });
    return [];
  }
}

// 3. USER-FACING
class UserError extends Error {
  constructor(
    message: string,
    public details: unknown
  ) {
    super(message);
  }
}
```

---

## LOGGING

### Règles
```
❌ INTERDIT
- console.log en production
- Logs sans contexte
- Logs de secrets
- Erreurs silencieuses

✅ OBLIGATOIRE
- Logger structuré (winston/pino)
- Contexte systématique
- Niveaux appropriés
- Stack traces erreurs
```

### Pattern
```typescript
logger.error('[Service] Operation failed', {
  error: {
    message: error.message,
    stack: error.stack
  },
  context: {
    userId,
    sessionId,
    operation: 'toolExecution',
    timestamp: Date.now()
  }
});

// Niveaux
logger.error()  // Erreurs critiques
logger.warn()   // Situations anormales gérées
logger.info()   // Événements importants
logger.dev()    // Debug temporaire (pas en prod)
```

---

## TESTS

### Couverture minimale
```
UNITAIRES : > 80%
→ Tous hooks
→ Tous services
→ Tous utils

INTÉGRATION : Flows critiques
→ User message → tool call → réponse
→ Édition → régénération
→ Session change → chargement

CONCURRENCE : Non-régression
→ 10 messages simultanés (zéro doublon)
→ Idempotence tool calls
→ Refresh pendant exécution

PERFORMANCE : Benchmarks
→ < 2s réponse simple
→ < 5s avec 3 tool calls
→ Mémoire stable 100 messages
```

### Pattern
```typescript
describe('[Service] ToolOrchestrator', () => {
  it('should execute atomically', async () => {
    // Arrange
    const toolCalls = [mockToolCall];
    
    // Act
    const result = await orchestrator.execute(toolCalls);
    
    // Assert
    expect(result.success).toBe(true);
    
    // Cleanup
  });
});
```

---

## CLEAN CODE

### Nommage
```
VARIABLES
→ Substantifs : userData, messageList
→ Booléens : isLoading, hasErrors
→ Constantes : MAX_RETRIES, API_TIMEOUT

FONCTIONS
→ Verbes : fetchMessages, executeToolCall
→ Préfixes : get/set, is/has, create/delete

COMPOSANTS
→ PascalCase : ChatInput, MessageList

HOOKS
→ use[Nom] : useChatResponse

SERVICES
→ [Nom]Orchestrator/Service/Manager

❌ INTERDIT : msg, tmp, res, usr, data, value
```

### Fonctions
```
✅ RÈGLES
- 1 fonction = 1 responsabilité
- Max 50 lignes (si plus, décomposer)
- Max 3 params (sinon object options)
- Return early pattern
- Pas d'effets de bord cachés

✅ PATTERN
function process(data) {
  if (!data) return null;
  if (!data.isValid) return null;
  return processValid(data);
}
```

---

## PERFORMANCE

### React
```
✅ useMemo pour calculs coûteux
✅ useCallback pour props
✅ React.memo pour composants purs
✅ Lazy loading (React.lazy)
✅ Virtualisation si > 100 items
```

### Database
```
✅ Indexes sur colonnes WHERE/JOIN
✅ LIMIT systématique
✅ Pagination serveur
✅ Select colonnes nécessaires uniquement
```

### API
```
✅ Debounce inputs (300ms)
✅ Throttle scroll (100ms)
✅ Cache avec TTL
✅ Batch writes
```

---

## SÉCURITÉ

### Inputs
```
✅ Validation Zod serveur
✅ Sanitization avant DB
✅ Rate limiting user/IP
✅ Max length strings
```

### Auth
```
✅ Vérifier token chaque requête
✅ Expiration 1h
✅ RLS Postgres activé
✅ HTTPS uniquement
```

### Secrets
```
✅ Variables environnement uniquement
✅ Vérification démarrage
✅ Jamais loggés
✅ Rotation régulière
```

---

## DOCUMENTATION

### Fonctions publiques
```typescript
/**
 * Execute tool calls atomiquement
 * @param toolCalls - Tools à exécuter
 * @param context - Session, user, token
 * @returns Résultats structurés
 * @throws {ValidationError} Si invalides
 * @throws {NetworkError} Si API down
 */
```

### Composants
```typescript
/**
 * Input chat multi-modal
 * @param onSend - Callback envoi
 * @param loading - État chargement
 * @param sessionId - ID pour upload S3
 */
```

---

## REFACTORING

### Priorités
```
🔴 IMMÉDIAT (Bloquant)
- Race conditions
- Memory leaks
- Security issues
- Data corruption

🟡 SEMAINE (Dette)
- Fichier > 500 lignes
- Logique dupliquée 3x
- Tests manquants critiques
- Performance > 5s

🟢 PLUS TARD
- Nommage sub-optimal
- Commentaires obsolètes
```

### Process
```
1. Tests AVANT (couvrir existant)
2. Refactor petits commits
3. Tests APRÈS (valider identique)
4. Performance review
5. Deploy progressif
```

---

## COMMITS

### Format
```
type(scope): description

feat: Nouvelle fonctionnalité
fix: Correction bug
refactor: Sans changement comportement
test: Tests
perf: Performance
docs: Documentation
chore: Maintenance

Exemple :
feat(chat): Add tool call retry with backoff
fix(db): Prevent race in message insert
```

---

## CHECKLIST PRÉ-COMMIT

```bash
✅ npm run typecheck  # 0 erreur
✅ npm run lint       # 0 warning
✅ npm run test       # Tous passent
✅ npm run build      # OK

Mental :
□ Race conditions évitées ?
□ Erreurs gérées ?
□ Logs suffisants ?
□ Tests couverts ?
□ Performance OK ?
□ Maintenable ?
```

---

## RED FLAGS

### Architecture
```
❌ God objects (> 500 lignes)
❌ Circular dependencies
❌ Logique métier dans React
❌ State global abusif
```

### Code
```
❌ Mutations state direct
❌ Callbacks hell (3+ niveaux)
❌ Copy-paste logique métier
❌ Magic numbers
```

### Pratiques
```
❌ Commits "wip" ou "fix"
❌ Push sans tests
❌ console.log en prod
❌ TODO sans issue
```

---

## PHILOSOPHIE

```
1. CODE POUR L'ÉQUIPE
   Pour le dev qui arrive demain
   Pour le debug à 3h du matin

2. FAIL FAST
   Erreurs explicites > bugs silencieux
   Validation stricte > permissivité

3. MAINTENABILITÉ > VÉLOCITÉ
   1 semaine propre > 3 jours dette
   "Slow is smooth, smooth is fast"

4. PRAGMATISME INTELLIGENT
   MVP OK, dette critique NON
   Exceptions évaluées au cas par cas
   Toujours justifier et documenter
```

---

## ENGAGEMENT

**Nous sommes des senior developers.**  
Nous construisons, pas bricolons.

**Nous visons haut.**  
ChatGPT, Claude, Cursor ont commencé comme nous.

**Nous sommes rigoureux.**  
Nos utilisateurs comptent sur nous.

**Nous sommes pragmatiques.**  
MVP pour tester, excellence pour scaler.

**Ce guide est notre standard.**

---

**Version :** 2.0 - Optimisé cognition LLM  
**Focus :** Scannable, précis, actionnable
