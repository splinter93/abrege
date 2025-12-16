# Tests Manuels E2E - Auto-Rename Sessions

## ✅ Implémentation Terminée

Tous les composants de l'auto-rename ont été implémentés avec succès :

1. **Service** : `SessionTitleGenerator.ts` (✅ TypeScript strict, 0 erreur)
2. **Endpoint API** : `/api/chat/sessions/[sessionId]/generate-title` (✅ Validation Zod, auth, ownership)
3. **Intégration** : Appel async non-bloquant dans `/messages/add` (✅ Fire and forget)
4. **Tests unitaires** : Service + Endpoint (✅ Couverture complète)
5. **Refresh sidebar** : Hook `useChatSessionsPolling` (✅ Polling 5s)

---

## 📋 Tests Manuels à Effectuer

### Test 1 : Génération de titre basique

**Objectif** : Vérifier que le titre est généré automatiquement après le premier message

**Étapes** :
1. Ouvrir le chat (`http://localhost:3000/chat`)
2. Cliquer sur "Nouvelle conversation" (créer une session)
3. **Vérifier** : Dans la sidebar, le nom initial est "Nouvelle conversation"
4. Envoyer le premier message user : `Comment créer une API REST avec Node.js ?`
5. **Attendre 2-5 secondes** (Groq génère le titre)
6. **Vérifier** : Dans la sidebar, le nom devient quelque chose comme `Créer une API REST avec Node.js`

**Résultat attendu** :
- ✅ Titre généré automatiquement
- ✅ Titre descriptif et pertinent
- ✅ Pas de ralentissement de l'envoi du message
- ✅ Pas d'erreur dans la console

---

### Test 2 : Titre long (truncation)

**Objectif** : Vérifier que les titres trop longs sont tronqués à 60 caractères

**Étapes** :
1. Créer nouvelle session
2. Envoyer un message très long et complexe :
   ```
   J'aimerais comprendre comment implémenter un système complet de gestion d'utilisateurs avec authentification JWT, autorisation basée sur les rôles, réinitialisation de mot de passe par email, vérification en deux étapes et gestion de sessions concurrentes dans une application Node.js utilisant Express et PostgreSQL
   ```
3. **Attendre 2-5 secondes**
4. **Vérifier** : Le titre dans la sidebar est tronqué à ~60 caractères avec "…" à la fin

**Résultat attendu** :
- ✅ Titre ≤ 61 caractères (60 + ellipse)
- ✅ Coupure intelligente (pas au milieu d'un mot)

---

### Test 3 : Messages suivants (pas de re-génération)

**Objectif** : Vérifier que seul le premier message déclenche la génération

**Étapes** :
1. Dans la même session que Test 1 ou 2
2. Envoyer un 2ème message : `Merci, peux-tu m'expliquer les routes ?`
3. Envoyer un 3ème message : `Et la connexion à la base de données ?`
4. **Vérifier** : Le titre ne change PAS

**Résultat attendu** :
- ✅ Titre inchangé après les messages suivants
- ✅ Pas d'appel API inutile (vérifier Network tab si besoin)

---

### Test 4 : Nouvelle session dans la même sidebar

**Objectif** : Vérifier que plusieurs sessions peuvent être créées et renommées

**Étapes** :
1. Créer Session A, envoyer message : `Qu'est-ce que React ?`
2. **Attendre 5s**, vérifier titre Session A mis à jour
3. Créer Session B, envoyer message : `Comment apprendre Python ?`
4. **Attendre 5s**, vérifier titre Session B mis à jour
5. Revenir à Session A
6. **Vérifier** : Les deux sessions ont des titres différents et corrects

**Résultat attendu** :
- ✅ Session A : Titre pertinent sur React
- ✅ Session B : Titre pertinent sur Python
- ✅ Pas de confusion entre les sessions

---

### Test 5 : Gestion d'erreurs (Groq down)

**Objectif** : Vérifier que l'échec de génération n'impacte pas l'UX

**Étapes** :
1. **Temporairement** : Changer `GROQ_API_KEY` dans `.env.local` pour une clé invalide
2. Redémarrer le serveur : `npm run dev`
3. Créer nouvelle session
4. Envoyer premier message : `Test erreur API`
5. **Attendre 5s**
6. **Vérifier** : 
   - Message user s'affiche normalement
   - Titre reste "Nouvelle conversation" (pas de crash)
   - Console serveur : Warning log (pas d'erreur bloquante)

**Résultat attendu** :
- ✅ Pas de crash
- ✅ Message user envoyé avec succès
- ✅ Titre par défaut conservé
- ✅ Log warning dans la console serveur

**⚠️ IMPORTANT** : Remettre la vraie clé API après ce test !

---

### Test 6 : Refresh sidebar (polling)

**Objectif** : Vérifier que la sidebar se rafraîchit automatiquement

**Étapes** :
1. Ouvrir 2 onglets du chat (même utilisateur)
2. Onglet 1 : Créer session, envoyer message
3. Onglet 2 : **Attendre 5-10s** (intervalle polling)
4. **Vérifier** : Onglet 2 affiche la nouvelle session avec le titre généré

**Résultat attendu** :
- ✅ Sidebar onglet 2 se met à jour automatiquement
- ✅ Nouveau titre visible sans refresh manuel

---

### Test 7 : Caractères spéciaux

**Objectif** : Vérifier la sanitization des titres

**Étapes** :
1. Créer session
2. Envoyer message : `Comment utiliser les "hooks" en React ?`
3. **Attendre 5s**
4. **Vérifier** : Titre ne contient pas de guillemets autour (sanitization OK)

**Résultat attendu** :
- ✅ Titre sans guillemets : `Comment utiliser les hooks en React`
- ✅ Première lettre capitalisée

---

## 🐛 Debugging

### Console Navigateur

Ouvrir DevTools (F12) → **Console** :
- Rechercher : `[SessionTitleGenerator]`
- Rechercher : `[API /generate-title]`
- Rechercher : `[API /messages/add]`

Logs attendus après premier message :
```
[API /messages/add] 📥 Message reçu: { role: 'user', ... }
[API /messages/add] ✅ Message ajouté: { sequenceNumber: 1, ... }
[API /messages/add] 🎯 Auto-rename démarré (async)
```

### Network Tab

DevTools → **Network** :
1. Filtrer : `generate-title`
2. Après premier message, une requête POST devrait apparaître
3. Status : **200 OK**
4. Response body : `{ "success": true, "title": "...", "executionTime": 1234 }`

### Console Serveur

Terminal où `npm run dev` tourne :
- Rechercher : `[SessionTitleGenerator]`
- Logs attendus :
  ```
  [SessionTitleGenerator] 🎯 Génération titre démarrée { sessionId: '...', ... }
  [SessionTitleGenerator] 📡 Appel API Groq { model: 'openai/gpt-oss-20b', ... }
  [SessionTitleGenerator] ✅ Titre généré avec succès { title: '...', executionTime: 1234 }
  [API /generate-title] ✅ Titre généré et sauvegardé { sessionId: '...', title: '...' }
  ```

---

## ⚙️ Configuration

### Variables d'environnement requises

`.env.local` :
```bash
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

### Modèle Groq

Configuré dans `SessionTitleGenerator.ts` :
- **Modèle** : `openai/gpt-oss-20b`
- **Température** : `0.7`
- **Max tokens** : `20`
- **Timeout** : `10s`

---

## 📊 Métriques à Surveiller

### Performance
- ⏱️ Temps génération titre : **< 2s** (moyenne attendue)
- ⏱️ Temps total (API + DB update) : **< 3s**
- ⏱️ Impact sur envoi message : **0s** (non-bloquant)

### Taux de succès
- 🎯 Génération réussie : **> 95%**
- ⚠️ Échecs acceptables : Groq down, timeout réseau

### Qualité des titres
- ✅ Descriptif et pertinent
- ✅ ≤ 60 caractères
- ✅ Pas de guillemets/ponctuation inutile
- ✅ Première lettre capitalisée

---

## 🚀 Lancement des tests

```bash
# 1. S'assurer que le serveur tourne
npm run dev

# 2. Ouvrir le navigateur
open http://localhost:3000/chat

# 3. Suivre les tests 1 à 7 ci-dessus

# 4. Vérifier les logs serveur dans le terminal
# 5. Vérifier les logs client dans DevTools Console
```

---

## ✅ Checklist Validation

- [ ] Test 1 : Génération basique (✅ titre généré)
- [ ] Test 2 : Truncation (✅ ≤ 60 chars)
- [ ] Test 3 : Pas de re-génération (✅ titre stable)
- [ ] Test 4 : Multiples sessions (✅ titres distincts)
- [ ] Test 5 : Gestion erreurs (✅ pas de crash)
- [ ] Test 6 : Refresh sidebar (✅ polling OK)
- [ ] Test 7 : Caractères spéciaux (✅ sanitization)

---

## 📝 Rapport de Test (Template)

```markdown
## Rapport Test Auto-Rename Sessions
Date : [DATE]
Testeur : [NOM]
Environnement : [Local/Staging/Prod]

### Résultats
- Test 1 : ✅ / ❌ - Notes : ...
- Test 2 : ✅ / ❌ - Notes : ...
- Test 3 : ✅ / ❌ - Notes : ...
- Test 4 : ✅ / ❌ - Notes : ...
- Test 5 : ✅ / ❌ - Notes : ...
- Test 6 : ✅ / ❌ - Notes : ...
- Test 7 : ✅ / ❌ - Notes : ...

### Métriques
- Temps moyen génération : [X]s
- Taux succès : [X]%
- Bugs découverts : [liste]

### Commentaires
[Observations, suggestions d'amélioration]
```

---

## 🔧 Troubleshooting

### Titre ne se génère pas
1. Vérifier `GROQ_API_KEY` valide
2. Vérifier logs serveur (erreurs API ?)
3. Vérifier Network tab (requête POST envoyée ?)
4. Vérifier que c'est bien le **premier message** (sequence_number = 1)

### Titre incorrect/bizarre
1. Vérifier le prompt système dans `SessionTitleGenerator.ts`
2. Vérifier la sanitization (ligne 265+)
3. Tester avec message plus simple/court

### Sidebar ne refresh pas
1. Vérifier que `useChatSessionsPolling` est appelé dans `SidebarUltraClean`
2. Vérifier l'intervalle (défaut : 5s)
3. Forcer refresh manuel : fermer/ouvrir sidebar

### Performance lente
1. Vérifier latence réseau vers Groq
2. Vérifier timeout (défaut : 10s)
3. Vérifier que le modèle est bien `gpt-oss-20b` (plus rapide que 120b)

---

**🎉 Implémentation conforme au GUIDE-EXCELLENCE-CODE.md**
- TypeScript strict ✅
- Gestion erreurs 3 niveaux ✅
- Logs structurés ✅
- Tests unitaires ✅
- Performance optimisée ✅
- Sécurité (auth + RLS) ✅

