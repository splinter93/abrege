# CANVA V2 - STATUS IMPLEMENTATION

**Date:** 12 novembre 2025  
**Architecture:** Propre avec table canva_sessions

---

## ✅ TERMINE (Pret pour tests)

### 1. Migration DB
- [x] Table `canva_sessions` creee
- [x] Colonne `is_canva_draft` dans articles
- [x] Indexes optimises
- [x] RLS Policies

**Fichier:** `supabase/migrations/20251112_create_canva_sessions.sql`

### 2. Types TypeScript
- [x] `src/types/canva.ts` - Interfaces completes
- [x] `src/utils/canvaValidationSchemas.ts` - Schemas Zod

### 3. Service Refactore
- [x] `CanvaNoteService.createCanvaNote()` - Cree note + session
- [x] `CanvaNoteService.saveCanva()` - Sauvegarde dans classeur
- [x] `CanvaNoteService.getCanvasForSession()` - Liste canvases
- [x] `CanvaNoteService.updateCanvaStatus()` - Change statut
- [x] `CanvaNoteService.deleteCanva()` - Supprime canva

**Fichier:** `src/services/canvaNoteService.ts`

### 4. API V2 Endpoints (Sessions unifiées)
- [x] POST `/api/v2/canva/session` — Ouvrir/Créer un canva (note existante ou draft)
- [x] POST `/api/v2/canva/session/{canvaSessionId}/close` — Fermer le panneau (statut closed)
- [x] DELETE `/api/v2/canva/session/{canvaSessionId}` — Détacher la session (supprime canva_sessions)
- [x] GET `/api/v2/canva/session/{chatSessionId}` — Liste par session chat
- [x] Legacy `/api/v2/canva/create` & `/api/v2/canva/open-note` → Proxy vers `POST /canva/session`

### 5. Store Refactore
- [x] `useCanvaStore.openCanva(userId, chatSessionId)` - Appelle API
- [x] Interface `CanvaSession` avec `chatSessionId`
- [x] Streaming state preserved

**Fichier:** `src/store/useCanvaStore.ts`

### 6. Integration Chat UI
- [x] `ChatFullscreenV2.handleOpenCanva()` - Passe chatSessionId
- [x] Schema validation API create note avec `is_canva_draft`

**Fichiers:**
- `src/components/chat/ChatFullscreenV2.tsx`
- `src/utils/v2ValidationSchemas.ts`
- `src/app/api/v2/note/create/route.ts`

---

## ⏳ EN COURS / TODO

### 7. Filtrage Notes Recentes
- [ ] Dashboard: Exclure `is_canva_draft = true`
- [ ] API `/api/v2/note/recent`: Ajouter filtre

**Impact:** Empeche pollution dashboard

### 8. Recovery Modal
- [ ] Composant `RecoverCanvaModal.tsx`
- [ ] Detection au mount ChatFullscreenV2
- [ ] UI liste canvases status='closed'

**Impact:** Recovery apres crash

### 9. Tests Manuels
- [ ] Ouvrir canva cree note + canva_sessions
- [ ] Verifier dashboard ne montre pas canvases
- [ ] LLM ecrit dans canva
- [ ] Fermer canva (status closed)
- [ ] Supprimer canva (CASCADE)

### 10. Audit Complet
- [ ] Architecture DB
- [ ] Endpoints API conformite
- [ ] Performance
- [ ] Securite
- [ ] TypeScript strict
- [ ] Logs structures

---

## 🧪 TESTS IMMEDIATS POSSIBLES

### Test 1: Ouvrir Canva
```
1. Ouvrir chat
2. Cliquer bouton canva
3. Verifier console logs:
   - "[CanvaStore] Opening canva"
   - "[API Canva Create] Creating canva"
   - "[CanvaNoteService] ✅ Note created"
   - "[CanvaNoteService] ✅ Canva session created"
```

### Test 2: Verifier DB
```sql
-- Verifier table canva_sessions
SELECT * FROM canva_sessions ORDER BY created_at DESC LIMIT 5;

-- Verifier notes avec is_canva_draft
SELECT id, source_title, is_canva_draft, classeur_id 
FROM articles 
WHERE is_canva_draft = TRUE 
ORDER BY created_at DESC LIMIT 5;
```

### Test 3: LLM Ecrit
```
1. Dans canva, demander au LLM d'ecrire
2. LLM utilise endpoints classiques (update note)
3. Auto-save fonctionne (toutes les 2s)
4. Contenu persiste en DB
```

---

## 🚨 AVANT DE TESTER

### 1. Appliquer Migration DB
```bash
# Verifier migration existe
ls supabase/migrations/20251112_create_canva_sessions.sql

# Appliquer via Supabase CLI ou Dashboard SQL Editor
```

### 2. Verifier TypeScript
```bash
npm run type-check
# ou
npx tsc --noEmit
```

### 3. Redemarrer Dev Server
```bash
# Ctrl+C puis
npm run dev
```

---

## 📊 DIFFERENCES ARCHITECTURE V1 vs V2

### V1 (Hybride Simple)
```
- Note DB orpheline (classeur_id = NULL)
- Pas de table dediee
- Pollution notes recentes
- Pas de lien chat <-> canva
```

### V2 (Architecture Propre)
```
- Table canva_sessions dediee
- Lien vers chat_sessions
- Flag is_canva_draft (filtre notes)
- Status explicite (open/closed/saved)
- Recovery crash possible
```

---

## 🎯 PROCHAINES ETAPES

### Immediate (30 min)
1. Tester ouverture canva
2. Verifier creation DB
3. Tester LLM ecrit

### Court terme (1h)
1. Filtrage notes recentes
2. Endpoint /open manquant
3. Tests manuels complets

### Moyen terme (2h)
1. Recovery modal
2. Streaming LLM (Phase 2)
3. Audit complet

---

## ❓ PROBLEMES POTENTIELS

### Si erreur "canva_sessions not found"
→ Migration pas appliquee. Appliquer SQL migration.

### Si erreur TypeScript sur chatSessionId
→ Restart TS server (Cmd+Shift+P > Restart TS Server)

### Si notes apparaissent dans dashboard
→ Filtrage pas implemente. Continuer avec etape 7.

### Si LLM ne peut pas ecrire
→ Verifier noteId dans canva session. Should work avec architecture actuelle.

---

**Status global: 70% complete - TESTABLE**

**Temps restant estime: 2h pour 100%**

