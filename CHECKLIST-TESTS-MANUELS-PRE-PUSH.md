# 🧪 CHECKLIST TESTS MANUELS - AVANT PUSH

**Date :** 6 janvier 2026  
**Contexte :** Refactoring `v2DatabaseUtils.ts` + modifications database queries/mutations

---

## 🔴 RISQUES DE RÉGRESSION IDENTIFIÉS

### Zones modifiées critiques

1. **`src/utils/database/`** - Refactoring queries/mutations
   - `mutations/noteMutations.ts` ⚠️
   - `mutations/dossierMutations.ts` ⚠️
   - `queries/noteQueries.ts` ⚠️
   - `permissions/permissionQueries.ts` ⚠️

2. **`src/utils/v2DatabaseUtils.ts`** - Modifications (2372 lignes)
   - Fichier massif, modifications risquées
   - Point central de toute l'application

3. **Styles** - `src/styles/chat-clean.css`
   - Risque visuel uniquement (non bloquant)

---

## ✅ CHECKLIST TESTS MANUELS

### 🔴 CRITIQUE (DOIT PASSER)

#### 1. Authentication & Login

- [ ] **Se connecter**
  - Aller sur `/login`
  - Entrer email + password
  - Vérifier redirection vers `/private`
  - ✅ **Risque :** Auth check dans queries/mutations

- [ ] **Restaurer session existante**
  - Rafraîchir la page après login
  - Vérifier que l'utilisateur reste connecté
  - ✅ **Risque :** Permissions queries

---

#### 2. CRUD Notes (FLOW CRITIQUE)

- [ ] **Créer une note**
  - Cliquer "Nouvelle note" ou `Ctrl+N`
  - Vérifier que l'éditeur s'ouvre
  - Écrire du texte
  - Attendre sauvegarde auto (5-6 secondes)
  - Rafraîchir la page
  - ✅ **Vérifier :** Note sauvegardée et réapparaît
  - ✅ **Risque :** `noteMutations.ts` - CREATE

- [ ] **Modifier une note existante**
  - Ouvrir une note existante
  - Modifier le contenu
  - Attendre sauvegarde auto
  - Rafraîchir
  - ✅ **Vérifier :** Modifications persistées
  - ✅ **Risque :** `noteMutations.ts` - UPDATE

- [ ] **Lire une note**
  - Ouvrir une note depuis la sidebar
  - ✅ **Vérifier :** Contenu chargé correctement
  - ✅ **Risque :** `noteQueries.ts` - READ

- [ ] **Supprimer une note**
  - Cliquer sur "Supprimer" / Trash
  - ✅ **Vérifier :** Note disparaît de la liste
  - Rafraîchir
  - ✅ **Vérifier :** Note toujours supprimée
  - ✅ **Risque :** `noteMutations.ts` - DELETE

- [ ] **Rechercher une note**
  - Utiliser la barre de recherche
  - ✅ **Vérifier :** Résultats affichés
  - ✅ **Risque :** `noteQueries.ts` - SEARCH

---

#### 3. CRUD Dossiers (FLOW CRITIQUE)

- [ ] **Créer un dossier**
  - Cliquer "Nouveau dossier"
  - Entrer nom
  - ✅ **Vérifier :** Dossier apparaît dans la sidebar
  - ✅ **Risque :** `dossierMutations.ts` - CREATE

- [ ] **Renommer un dossier**
  - Clic droit → Renommer
  - Modifier nom
  - ✅ **Vérifier :** Nom mis à jour
  - ✅ **Risque :** `dossierMutations.ts` - UPDATE

- [ ] **Déplacer une note dans un dossier**
  - Drag & drop ou menu "Déplacer"
  - ✅ **Vérifier :** Note déplacée
  - Rafraîchir
  - ✅ **Vérifier :** Position persistée
  - ✅ **Risque :** `noteMutations.ts` - MOVE

- [ ] **Supprimer un dossier**
  - Clic droit → Supprimer
  - ✅ **Vérifier :** Dossier disparaît
  - ✅ **Risque :** `dossierMutations.ts` - DELETE

---

#### 4. Permissions & Partage

- [ ] **Partager une note (publique)**
  - Ouvrir menu partage
  - Changer visibilité → Publique
  - ✅ **Vérifier :** URL publique générée
  - Ouvrir URL en navigation privée
  - ✅ **Vérifier :** Note accessible sans login
  - ✅ **Risque :** `permissionQueries.ts`

- [ ] **Partager une note (privée)**
  - Changer visibilité → Privée
  - ✅ **Vérifier :** Note non accessible publiquement
  - ✅ **Risque :** `permissionQueries.ts`

---

#### 5. Chat (FLOW CRITIQUE)

- [ ] **Ouvrir le chat**
  - Cliquer bouton Chat ou `Ctrl+K`
  - ✅ **Vérifier :** Interface chat s'ouvre
  - ✅ **Risque :** Styles (`chat-clean.css`)

- [ ] **Envoyer un message**
  - Taper un message
  - Appuyer Enter
  - ✅ **Vérifier :** Message affiché
  - ✅ **Vérifier :** Réponse LLM reçue (ou erreur claire)
  - ✅ **Risque :** Styles uniquement

- [ ] **Créer note via chat**
  - Envoyer "Créer une note X"
  - ✅ **Vérifier :** Note créée via tool call
  - ✅ **Risque :** `noteMutations.ts` - CREATE via API

---

#### 6. Tool Calls (AGENTS)

- [ ] **Exécuter tool call simple**
  - Demander au chat "Liste mes notes"
  - ✅ **Vérifier :** Tool call exécuté
  - ✅ **Vérifier :** Résultats affichés
  - ✅ **Risque :** `noteQueries.ts` - READ via API

- [ ] **Tool call création note**
  - Demander "Créer note Test"
  - ✅ **Vérifier :** Note créée
  - ✅ **Vérifier :** Note visible dans sidebar
  - ✅ **Risque :** `noteMutations.ts` - CREATE via tool call

---

### 🟡 IMPORTANT (VERIFIER SI POSSIBLE)

#### 7. Performance & UI

- [ ] **Chargement initial**
  - Ouvrir `/private`
  - ✅ **Vérifier :** Page charge < 3 secondes
  - ✅ **Vérifier :** Pas d'erreurs console

- [ ] **Navigation sidebar**
  - Cliquer entre notes/dossiers
  - ✅ **Vérifier :** Transitions fluides
  - ✅ **Vérifier :** Pas de lag

- [ ] **Styles chat**
  - Ouvrir chat
  - ✅ **Vérifier :** Interface propre (pas de CSS cassé)
  - ✅ **Risque :** `chat-clean.css` modifié

---

#### 8. Edge Cases

- [ ] **Note vide**
  - Créer note, ne rien écrire, fermer
  - ✅ **Vérifier :** Pas d'erreur
  - ✅ **Vérifier :** Note supprimée automatiquement (ou conservée selon logique)

- [ ] **Dossier vide**
  - Créer dossier, supprimer
  - ✅ **Vérifier :** Pas d'erreur

- [ ] **Double-clic rapide**
  - Cliquer 2x rapidement "Nouvelle note"
  - ✅ **Vérifier :** Une seule note créée (idempotence)
  - ✅ **Risque :** Race condition

- [ ] **Refresh pendant opération**
  - Modifier note, rafraîchir immédiatement
  - ✅ **Vérifier :** Pas de perte de données
  - ✅ **Risque :** Auto-save

---

### 🟢 OPTIONNEL (SI TEMPS)

#### 9. Multi-device / Realtime

- [ ] **Modification simultanée**
  - Ouvrir même note sur 2 onglets
  - Modifier dans un onglet
  - ✅ **Vérifier :** Mise à jour dans l'autre onglet (si realtime activé)

---

## 🚨 SIGNAUX D'ALARME

### ❌ ARRÊTER IMMÉDIATEMENT SI :

1. **Login ne fonctionne plus** → Rollback immédiat
2. **Création note échoue** → Rollback immédiat
3. **Erreur 500 sur endpoints API** → Rollback immédiat
4. **Données perdues** → Rollback immédiat
5. **Permissions cassées** → Rollback immédiat

### ⚠️ SIGNALER MAIS CONTINUER SI :

1. UI légèrement cassée (CSS)
2. Performance légèrement dégradée
3. Erreurs console non-critiques
4. Tool calls lents mais fonctionnels

---

## 📋 ORDRE RECOMMANDÉ DE TEST

### Phase 1 : Critiques (15 min)
1. Login ✅
2. Créer note ✅
3. Modifier note ✅
4. Supprimer note ✅

### Phase 2 : Fonctionnel (15 min)
5. Créer dossier ✅
6. Déplacer note ✅
7. Chat simple ✅
8. Tool call création ✅

### Phase 3 : Edge cases (10 min)
9. Permissions/partage ✅
10. Double-clic ✅
11. Refresh pendant opération ✅

**Total : ~40 minutes de tests**

---

## 🔍 COMMENT DÉBUGGER SI PROBLÈME

### Si erreur création note :

1. Ouvrir DevTools → Console
2. Vérifier erreurs réseau (Network tab)
3. Vérifier endpoint `/api/v2/note/create`
4. Vérifier logs Sentry (si configuré)
5. Vérifier `noteMutations.ts` ligne de création

### Si erreur permissions :

1. Vérifier token auth valide
2. Vérifier `permissionQueries.ts`
3. Vérifier RLS Supabase
4. Vérifier logs serveur

### Si données perdues :

1. **ROLLBACK IMMÉDIAT**
2. Vérifier backup DB Supabase
3. Analyser logs mutations
4. Comparer avec version précédente

---

## ✅ VALIDATION FINALE

### Avant de push :

- [ ] ✅ Tous les tests critiques passent (1-6)
- [ ] ✅ Au moins 3 tests importants passent (7-8)
- [ ] ✅ Aucun signal d'alarme ❌
- [ ] ✅ Build réussit (`npm run build`)
- [ ] ✅ Tests unitaires passent (`npm test` - sauf 7 tests connus)
- [ ] ✅ Pas d'erreurs TypeScript critiques dans code prod

---

## 📝 NOTES

- **Fichiers modifiés :** `v2DatabaseUtils.ts` + refactoring database/
- **Tests automatisés :** 587 passent, 7 échouent (NetworkRetryService - connu)
- **Build :** ✅ Compile avec succès
- **Monitoring :** Sentry activé → vérifier après déploiement

---

**Temps estimé :** 40 minutes  
**Priorité :** 🔴 Critique avant push

