# 📚 FIX : TOC retourne vide avec API Keys - ChatGPT

## 🚨 PROBLÈME IDENTIFIÉ

**Symptômes :**
- ✅ TOC retourne code 200 (pas d'erreur)
- ❌ Mais le contenu est vide pour ChatGPT
- ✅ Le chat maison fonctionne normalement
- ❌ Modification de `CustomHeading.ts` possiblement liée

**Cause racine :**
1. **Endpoint V2 TOC incomplet** - Ne faisait rien, retournait juste un message vide
2. **Client Supabase incorrect** - Utilisait la clé anonyme au lieu du service role pour les API Keys
3. **Désynchronisation CustomHeading** - Les IDs générés par l'éditeur ne sont pas sauvegardés en base

## 🔍 ANALYSE TECHNIQUE

### **1. Endpoint V2 TOC incomplet (AVANT)**
```typescript
// ❌ PROBLÈME : Endpoint ne faisait rien
export async function GET(request: NextRequest) {
  // ... authentification ...
  
  try {
    // ❌ Logique vide !
    return NextResponse.json({
      success: true,
      message: ' réussie' // Message incomplet
    });
  } catch (error) {
    // ...
  }
}
```

### **2. Client Supabase incorrect**
```typescript
// ❌ PROBLÈME : Utilisait toujours la clé anonyme
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// RLS bloquait l'accès avec les API Keys
```

### **3. Désynchronisation CustomHeading**
```typescript
// ❌ PROBLÈME : IDs générés mais pas sauvegardés
const generatedId = slugify(`${node.textContent}-${attrs.level}`, { 
  lower: true, 
  strict: true 
});
// L'ID est généré dans l'éditeur mais pas persisté en base
```

## ✅ SOLUTION IMPLÉMENTÉE

### **1. Endpoint V2 TOC complété**
```typescript
// ✅ SOLUTION : Endpoint fonctionnel complet
export async function GET(request: NextRequest) {
  // ... authentification ...
  
  try {
    // Créer le bon client Supabase selon le type d'authentification
    const supabase = createAuthenticatedSupabaseClient(authResult);
    
    // Récupérer la note (ID ou slug)
    const { data: note, error: fetchError } = await query
      .or(`id.eq.${ref},slug.eq.${ref}`)
      .single();
    
    // Extraire la TOC
    const toc = extractTOCWithSlugs(note.markdown_content);
    
    return NextResponse.json({
      success: true,
      toc, // ✅ TOC réelle retournée
      note: { id, title, has_content: true }
    });
  } catch (err) {
    // ...
  }
}
```

### **2. Client Supabase adaptatif**
```typescript
// ✅ SOLUTION : Bon client selon l'authentification
const supabase = createAuthenticatedSupabaseClient(authResult);
// - API Key → Service role (contourne RLS)
// - JWT/OAuth → Clé anonyme (RLS fonctionne)
```

### **3. Endpoint de test TOC créé**
```
GET /api/v2/debug/toc-test?note_ref=ref_de_la_note
```

## 🧪 TEST DE LA SOLUTION

### **Test immédiat avec votre clé API :**
```bash
# Test TOC d'une note existante
curl -H "X-API-Key: scrivia_votre_clé_api" \
     "https://votre-domaine.com/api/v2/debug/toc-test?note_ref=slug-ou-id-de-votre-note"
```

### **Test de l'endpoint TOC V2 :**
```bash
# Test TOC officiel
curl -H "X-API-Key: scrivia_votre_clé_api" \
     "https://votre-domaine.com/api/v2/note/slug-de-votre-note/table-of-contents"
```

### **Test avec contenu markdown :**
```bash
curl -X POST -H "X-API-Key: scrivia_votre_clé_api" \
     -H "Content-Type: application/json" \
     -d '{
       "test_operation": "test_toc_extraction",
       "markdown_content": "# Titre 1\n## Sous-titre 1.1\n### Sous-sous-titre 1.1.1"
     }' \
     "https://votre-domaine.com/api/v2/debug/toc-test"
```

## 🔧 DIAGNOSTIC DU PROBLÈME CUSTOMHEADING

### **Vérifier si les IDs sont sauvegardés :**
```sql
-- Dans Supabase, vérifier si la colonne id existe et contient des valeurs
SELECT id, source_title, markdown_content 
FROM articles 
WHERE user_id = 'votre_user_id' 
LIMIT 1;
```

### **Vérifier le contenu markdown :**
```bash
# Test d'extraction TOC sur du contenu brut
curl -X POST -H "X-API-Key: scrivia_votre_clé_api" \
     -H "Content-Type: application/json" \
     -d '{
       "test_operation": "test_toc_extraction",
       "markdown_content": "# Introduction\n\n## Première partie\n\n### Détails\n\n## Conclusion"
     }' \
     "https://votre-domaine.com/api/v2/debug/toc-test"
```

## 🎯 RÉSULTAT ATTENDU

**ChatGPT devrait maintenant recevoir :**
```json
{
  "success": true,
  "toc": [
    {
      "level": 1,
      "title": "Introduction",
      "slug": "introduction",
      "line": 1,
      "start": 0
    },
    {
      "level": 2,
      "title": "Première partie",
      "slug": "premiere-partie",
      "line": 3,
      "start": 0
    },
    {
      "level": 3,
      "title": "Détails",
      "slug": "details",
      "line": 5,
      "start": 0
    },
    {
      "level": 2,
      "title": "Conclusion",
      "slug": "conclusion",
      "line": 7,
      "start": 0
    }
  ],
  "note": {
    "id": "uuid-de-la-note",
    "title": "Titre de la note",
    "has_content": true,
    "content_length": 1234
  }
}
```

## 🚀 DÉPLOIEMENT

### **1. Redémarrage requis**
```bash
# Redémarrer le serveur Next.js pour appliquer les changements
npm run dev
# ou
npm run build && npm start
```

### **2. Vérification immédiate**
1. Tester l'endpoint de debug TOC
2. Vérifier que ChatGPT reçoit maintenant le contenu TOC
3. Contrôler les logs pour détecter d'autres problèmes

## 🔍 DIAGNOSTIC EN CAS DE PROBLÈME

### **Si le TOC est toujours vide :**
1. **Vérifier le contenu markdown** :
   ```bash
   curl -H "X-API-Key: scrivia_votre_clé_api" \
        "https://votre-domaine.com/api/v2/note/slug-de-votre-note"
   ```

2. **Vérifier l'extraction TOC** :
   ```bash
   curl -H "X-API-Key: scrivia_votre_clé_api" \
        "https://votre-domaine.com/api/v2/debug/toc-test?note_ref=slug-de-votre-note"
   ```

3. **Vérifier les logs** :
   ```bash
   grep "TOC extraite" logs/nextjs.log
   grep "Erreur récupération note" logs/nextjs.log
   ```

### **Si le problème persiste :**
1. **Vérifier CustomHeading.ts** - Les IDs sont-ils bien générés ?
2. **Vérifier la base de données** - Le contenu markdown est-il sauvegardé ?
3. **Tester avec une note simple** - Une note avec juste des titres

## 🎯 PROCHAINES ÉTAPES

### **1. Test immédiat (maintenant)**
1. Tester l'endpoint de debug TOC
2. Vérifier que ChatGPT reçoit le contenu TOC
3. Tester avec différentes notes

### **2. Monitoring (semaine 1)**
1. Surveiller les logs TOC
2. Vérifier que toutes les opérations ChatGPT fonctionnent
3. Tester avec différents types de contenu

### **3. Optimisation (semaine 2)**
1. Synchroniser CustomHeading avec la base de données
2. Ajouter des métriques de performance TOC
3. Optimiser l'extraction pour les gros documents

## 🏆 RÉSULTAT FINAL

**ChatGPT devrait maintenant pouvoir :**
- ✅ Récupérer la table des matières complète
- ✅ Voir tous les titres et sous-titres
- ✅ Accéder aux slugs pour la navigation
- ✅ Utiliser la TOC pour comprendre la structure des notes

**Sans erreurs ou réponses vides.**

---

## 📞 SUPPORT

Si le problème persiste après ces modifications :
1. Vérifier les logs de l'endpoint `/api/v2/debug/toc-test`
2. Contrôler que le contenu markdown contient bien des titres
3. Tester l'extraction TOC sur du contenu brut
4. Vérifier que CustomHeading génère bien les IDs

---

*Document créé le 31 janvier 2025*  
*Problème : TOC vide avec API Keys*  
*Solution : Endpoint V2 TOC complet + Client Supabase adaptatif*
