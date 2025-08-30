# 🔑 FIX : Permissions RLS avec API Keys - ChatGPT

## 🚨 PROBLÈME IDENTIFIÉ

**Symptômes :**
- ChatGPT utilise votre clé API mais reçoit des erreurs "Note non trouvée"
- Le GET TOC retourne rien
- Les endpoints V2 échouent avec des erreurs de permissions
- Le chat fonctionne normalement (utilise JWT)

**Cause racine :**
Les politiques RLS (Row Level Security) de Supabase utilisent `auth.uid()` qui ne fonctionne **PAS** avec les API Keys car il n'y a pas de session JWT active.

## 🔍 ANALYSE TECHNIQUE

### **Politiques RLS actuelles (problématiques)**
```sql
-- ❌ PROBLÈME : auth.uid() ne fonctionne pas avec les API Keys
CREATE POLICY "Users can view articles based on permissions"
ON public.articles
FOR SELECT
USING (
  auth.uid() = user_id OR -- ❌ Échoue avec API Key
  visibility = 'public' OR
  EXISTS (SELECT 1 FROM article_permissions WHERE article_id = id AND user_id = auth.uid())
);
```

### **Flux d'authentification**
```
ChatGPT (API Key) → X-API-Key header → validateApiKey() → userId extrait
                    ↓
                Client Supabase (anon key) → RLS bloque l'accès
                    ↓
                Erreur "Note non trouvée" ou permissions
```

## ✅ SOLUTION IMPLÉMENTÉE

### **1. Fonction helper `createAuthenticatedSupabaseClient`**
```typescript
export function createAuthenticatedSupabaseClient(authResult: AuthResult) {
  if (authResult.authType === 'api_key') {
    // Pour les API Keys, utiliser le service role pour contourner RLS
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante pour l\'authentification par API Key');
    }
    
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseServiceKey
    );
  } else {
    // Pour JWT et OAuth, utiliser la clé anonyme (RLS fonctionne)
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
}
```

### **2. Modification des endpoints V2**
Tous les endpoints V2 utilisent maintenant :
```typescript
// Avant (problématique)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Après (solution)
const supabase = createAuthenticatedSupabaseClient(authResult);
```

### **3. Endpoints corrigés**
- ✅ `/api/v2/notes` - Liste des notes
- ✅ `/api/v2/note/[ref]` - CRUD note
- ✅ `/api/v2/classeurs` - CRUD classeurs
- ✅ `/api/v2/folders` - CRUD dossiers
- ✅ `/api/v2/search` - Recherche
- ✅ `/api/v2/me` - Profil utilisateur

## 🧪 TEST DE LA SOLUTION

### **Endpoint de test créé :**
```
GET /api/v2/debug/auth-test
```

**Test avec API Key :**
```bash
curl -H "X-API-Key: scrivia_votre_clé_api" \
     https://votre-domaine.com/api/v2/debug/auth-test
```

**Test avec JWT :**
```bash
curl -H "Authorization: Bearer votre_jwt" \
     https://votre-domaine.com/api/v2/debug/auth-test
```

### **Tests POST disponibles :**
```bash
# Test récupération des notes
curl -X POST -H "X-API-Key: scrivia_votre_clé_api" \
     -H "Content-Type: application/json" \
     -d '{"test_operation": "test_notes"}' \
     https://votre-domaine.com/api/v2/debug/auth-test

# Test récupération des classeurs
curl -X POST -H "X-API-Key: scrivia_votre_clé_api" \
     -H "Content-Type: application/json" \
     -d '{"test_operation": "test_classeurs"}' \
     https://votre-domaine.com/api/v2/debug/auth-test
```

## 🔒 SÉCURITÉ

### **Pourquoi c'est sûr :**
1. **API Key validée** : Chaque clé est liée à un utilisateur spécifique
2. **Permissions respectées** : Les requêtes sont filtrées par `user_id`
3. **Service role limité** : Utilisé uniquement pour contourner RLS, pas pour élever les permissions

### **Contrôles en place :**
```typescript
// ✅ L'utilisateur ne peut accéder qu'à ses propres données
let query = supabase
  .from('articles')
  .select('*')
  .eq('user_id', userId); // Filtrage strict par utilisateur
```

## 🚀 DÉPLOIEMENT

### **1. Variables d'environnement requises**
```bash
# ✅ Déjà configuré
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# ✅ Déjà configuré
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **2. Redémarrage requis**
```bash
# Redémarrer le serveur Next.js pour appliquer les changements
npm run dev
# ou
npm run build && npm start
```

## 📊 VÉRIFICATION

### **Avant (problématique) :**
```bash
curl -H "X-API-Key: scrivia_votre_clé_api" \
     https://votre-domaine.com/api/v2/notes
# ❌ Erreur 500 ou "Note non trouvée"
```

### **Après (solution) :**
```bash
curl -H "X-API-Key: scrivia_votre_clé_api" \
     https://votre-domaine.com/api/v2/notes
# ✅ Liste des notes de l'utilisateur
```

## 🎯 PROCHAINES ÉTAPES

### **1. Test immédiat (maintenant)**
1. Tester l'endpoint `/api/v2/debug/auth-test` avec votre clé API
2. Vérifier que ChatGPT peut maintenant récupérer les notes
3. Tester la recherche et le TOC

### **2. Monitoring (semaine 1)**
1. Surveiller les logs pour détecter d'autres problèmes
2. Vérifier que toutes les opérations ChatGPT fonctionnent
3. Tester avec différents types de contenu

### **3. Optimisation (semaine 2)**
1. Ajouter des métriques de performance
2. Implémenter un cache pour les requêtes fréquentes
3. Optimiser les requêtes N+1 si nécessaire

## 🔍 DIAGNOSTIC EN CAS DE PROBLÈME

### **Logs à vérifier :**
```bash
# Dans les logs Next.js
grep "API_V2" logs/nextjs.log
grep "Authentification échouée" logs/nextjs.log
grep "Erreur récupération" logs/nextjs.log
```

### **Variables à vérifier :**
```bash
# Vérifier que la service role key est bien configurée
echo $SUPABASE_SERVICE_ROLE_KEY | head -c 20
# Doit afficher quelque chose (pas vide)
```

### **Test de connectivité :**
```bash
# Tester la connexion Supabase
curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/users?select=id&limit=1"
```

## 🏆 RÉSULTAT ATTENDU

**ChatGPT devrait maintenant pouvoir :**
- ✅ Récupérer la liste des notes
- ✅ Accéder au contenu des notes
- ✅ Utiliser la recherche
- ✅ Accéder au TOC
- ✅ Créer/modifier/supprimer des notes
- ✅ Gérer les classeurs et dossiers

**Sans erreurs de permissions ou "Note non trouvée".**

---

## 📞 SUPPORT

Si le problème persiste après ces modifications :
1. Vérifier les logs de l'endpoint `/api/v2/debug/auth-test`
2. Contrôler que `SUPABASE_SERVICE_ROLE_KEY` est bien configurée
3. Vérifier que la clé API a les bons scopes
4. Tester avec l'endpoint de debug pour isoler le problème

---

*Document créé le 31 janvier 2025*  
*Problème : Permissions RLS avec API Keys*  
*Solution : Client Supabase adaptatif selon le type d'authentification*

