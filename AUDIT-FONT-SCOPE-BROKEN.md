# 🔍 Audit : Système de Scope de Police (Tout/Titres/Corps)

**Date:** 1er novembre 2025  
**Statut:** ❌ Feature cassée - Non persistée  
**Verdict:** À supprimer ou à implémenter correctement

---

## 🐛 Problème identifié

Le système de scope de police (Tout/Titres/Corps) dans le FontSelector **ne persiste pas** les changements.

### Workflow actuel

**1. UI - FontSelector.tsx**
```tsx
const [fontScope, setFontScope] = useState<'all' | 'headings' | 'body'>('all');

const handleFontSelect = (fontName: string) => {
  if (onFontChange) {
    onFontChange(fontName, fontScope); // ✅ Scope passé
  }
}
```

**2. Hook - useFontManager.ts**
```tsx
const changeFont = (fontName: string, scope: 'all' | 'headings' | 'body' = 'all') => {
  if (scope === 'all' || scope === 'headings') {
    document.documentElement.style.setProperty('--editor-font-family-headings', fontFamily);
  }
  if (scope === 'all' || scope === 'body') {
    document.documentElement.style.setProperty('--editor-font-family-body', fontFamily);
  }
}
```
✅ **Fonctionne** - Les variables CSS sont changées

**3. Sauvegarde - Editor.tsx**
```tsx
const handleFontChange = async (fontName: string, scope?: 'all' | 'headings' | 'body') => {
  changeFont(fontName, scope || 'all'); // ✅ CSS changé
  await updateFontInDb(fontName); // ❌ PROBLÈME : Scope ignoré !
}
```

**4. Base de données**
```sql
-- Table articles
font_family TEXT DEFAULT 'Noto Sans'
```

❌ **PROBLÈME** : On ne sauvegarde que le nom de la police, pas le scope !

**5. Au rechargement**
```tsx
useEffect(() => {
  if (currentFont) {
    changeFont(currentFont); // ❌ Toujours scope='all' par défaut
  }
}, [currentFont, changeFont]);
```

❌ **RÉSULTAT** : Au rechargement, le scope est perdu, tout redevient "all"

---

## 📊 Analyse détaillée

### Ce qui fonctionne ✅

1. **UI** : Les boutons Tout/Titres/Corps changent bien le state
2. **CSS Live** : Les variables CSS sont bien modifiées en temps réel
3. **Visuel** : On voit bien le changement de police sur headings ou body
4. **Code propre** : Hook bien structuré, props bien typées

### Ce qui ne fonctionne pas ❌

1. **Persistance** : Le scope n'est jamais sauvegardé en DB
2. **Rechargement** : Au refresh, le scope redevient "all"
3. **Sync** : Impossible de savoir quel scope était actif
4. **UX trompeuse** : L'utilisateur croit que c'est sauvegardé

---

## 💡 Solutions possibles

### Option A : Supprimer la feature scope (RECOMMANDÉ)

**Avantages :**
- Simple et rapide
- Pas de migration DB
- UX claire : une seule police pour tout
- Moins de choix = meilleure UX

**Implémentation :**
1. Supprimer les boutons Tout/Titres/Corps du FontSelector
2. Toujours utiliser scope='all'
3. Simplifier le code

**Effort :** 30 min

### Option B : Implémenter correctement avec persistance

**Avantages :**
- Feature complète et fonctionnelle
- Flexibilité pour les utilisateurs avancés

**Inconvénients :**
- Complexité DB (3 colonnes ou JSONB)
- Migration nécessaire
- Plus de code à maintenir
- UX plus complexe

**Implémentation :**

**Approche 1 : 3 colonnes séparées**
```sql
ALTER TABLE articles 
ADD COLUMN font_headings TEXT DEFAULT 'Noto Sans',
ADD COLUMN font_body TEXT DEFAULT 'Noto Sans';
```

**Approche 2 : Objet JSONB**
```sql
ALTER TABLE articles 
ADD COLUMN font_config JSONB DEFAULT '{"all": "Noto Sans"}';
```

**Effort :** 2-3h (migration + hook + sync)

### Option C : Scope session-only (CSS uniquement)

**Avantages :**
- Pas de DB
- Feature disponible pendant l'édition
- Pas de migration

**Inconvénients :**
- Perdu au rechargement
- UX frustrante (utilisateur pense que c'est sauvé)

**Implémentation :**
- Garder le code actuel
- Ajouter un disclaimer "Non sauvegardé"

**Effort :** 15 min

---

## 🎯 Recommandation

### ⭐ OPTION A : SUPPRIMER LA FEATURE

**Justification :**
1. **Simplicité** : Une seule police pour tout = UX claire
2. **Pragmatisme** : Feature inutilisée si elle ne persiste pas
3. **Maintenabilité** : Moins de code = moins de bugs
4. **Standard** : Notion, Google Docs, etc. n'ont qu'une seule police

**Impact utilisateur :**
- Minime : Feature cassée actuellement
- Amélioration : UX plus claire

**Code à modifier :**
1. `FontSelector.tsx` - Supprimer boutons scope
2. `useFontManager.ts` - Simplifier (toujours 'all')
3. `Editor.tsx` - Supprimer param scope

---

## 🚨 État actuel

**Feature** : ❌ Cassée (non persistée)  
**Code** : ✅ Propre mais inutile  
**UX** : ❌ Trompeuse (utilisateur croit que c'est sauvé)  
**Priorité fix** : 🔴 Haute (enlever ou implémenter)

---

## 📝 Plan d'action recommandé

### Phase 1 : Simplification (30 min)

**1. FontSelector.tsx**
- Supprimer state `fontScope`
- Supprimer boutons Tout/Titres/Corps
- Toujours passer `'all'`

**2. useFontManager.ts**
- Simplifier : toujours changer headings ET body ensemble
- Supprimer param scope (ou le garder en interne mais toujours 'all')

**3. Editor.tsx**
- Supprimer param scope de `handleFontChange`
- Simplifier la signature

**4. Types**
- Supprimer `scope?: 'all' | 'headings' | 'body'` des interfaces

### Phase 2 : Tests (15 min)

- Vérifier que le changement de police fonctionne
- Vérifier la persistance
- Vérifier le rechargement

---

## 💬 Alternative future (si vraiment demandé)

Si un jour on veut vraiment cette feature :

**Migration DB :**
```sql
-- Option JSONB (recommandée)
ALTER TABLE articles 
ADD COLUMN font_config JSONB DEFAULT '{"all": "Noto Sans"}';

-- Exemples de valeurs
'{"all": "Inter"}'
'{"headings": "Noto Sans", "body": "Inter"}'
```

**Hook modifié :**
```tsx
// Sauvegarder
await updateNote(noteId, {
  font_config: { [scope]: fontName }
});

// Charger
useEffect(() => {
  if (note.font_config) {
    if (note.font_config.all) {
      changeFont(note.font_config.all, 'all');
    } else {
      if (note.font_config.headings) changeFont(note.font_config.headings, 'headings');
      if (note.font_config.body) changeFont(note.font_config.body, 'body');
    }
  }
}, [note.font_config]);
```

---

## ✅ Conclusion

**Recommandation :** Supprimer la feature scope (Option A)

**Arguments :**
- Feature cassée actuellement
- Complexité non justifiée
- Standard industrie : une seule police
- Gain maintenabilité
- Meilleure UX (moins de choix inutiles)

**Si on garde** : Implémenter correctement avec JSONB (Option B)

**À ne pas faire** : Garder l'état actuel (feature cassée)

