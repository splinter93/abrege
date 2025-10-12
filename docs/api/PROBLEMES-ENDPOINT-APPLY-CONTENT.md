# 🐛 Problèmes identifiés : Endpoint `applyContentOperations`

**Date** : 12 octobre 2025  
**Endpoint** : `POST /api/v2/note/[ref]/content:apply`

---

## 🎯 Problèmes rencontrés lors des tests

### 1. 🚨 CRITIQUE : Écrasement du titre avec `where: "after"` + regex

**Test effectué** :
```typescript
{
  action: "insert",
  target: { type: "regex", regex: { pattern: "### Le Time Blocking" } },
  where: "after",
  content: "```mermaid\n...\n```"
}
```

**Résultat attendu** :
```markdown
### Le Time Blocking

```mermaid
...
```

Plutôt que de travailler...
```

**Résultat obtenu** :
```markdown
```mermaid
...
```

Plutôt que de travailler...
```

**❌ Le titre "### Le Time Blocking" a été SUPPRIMÉ !**

**Cause probable** :
- `where: "after"` avec regex sur un heading **remplace** le match au lieu de simplement insérer après
- Le comportement devrait être : trouver le pattern → insérer APRÈS → préserver le pattern

**Solution attendue** :
- `where: "after"` ne doit JAMAIS écraser le pattern matché
- Ou créer un `where: "replace_match"` explicite pour les cas où on veut remplacer

---

### 2. ⚠️ Ciblage par heading avec path ne fonctionne pas

**Test effectué** :
```typescript
{
  action: "insert",
  target: { 
    type: "heading", 
    heading: { path: ["Les Principes Fondamentaux", "Le Conditionnement Opérant"] }
  },
  where: "inside_start"
}
```

**Résultat** :
```json
{
  "status": "skipped",
  "matches": 0,
  "error": "Cible non trouvée"
}
```

**❌ Le heading H3 sous le H2 n'est pas trouvé !**

**Contexte** :
- Structure de la note :
  ```markdown
  ## Les Principes Fondamentaux (H2)
  ### Le Conditionnement Opérant (H3)
  ```
- Le path hiérarchique ne match pas

**Cause probable** :
- La section "Les Principes Fondamentaux" n'existe plus dans la TOC
- Ou le matching de path hiérarchique ne fonctionne pas correctement

**Solution attendue** :
- Vérifier que le matching de path fonctionne avec des headings imbriqués
- Ou améliorer la résolution de path pour être plus tolérante

---

### 3. ℹ️ Ciblage par `heading_id` nécessite le `level` (non documenté ?)

**Test effectué** :
```typescript
{
  target: { 
    type: "heading", 
    heading: { heading_id: "le-conditionnement-operant" }
  }
}
```

**Résultat** :
```json
{
  "error": "Payload invalide",
  "details": ["Required"]
}
```

**Test avec `level` ajouté** :
```typescript
{
  target: { 
    type: "heading", 
    heading: { heading_id: "le-conditionnement-operant", level: 3 }
  }
}
```

**Résultat** :
Toujours une erreur 422

**❌ Le ciblage par `heading_id` seul ne fonctionne pas**

**Solution attendue** :
- Documenter clairement que `level` est requis
- Ou rendre `level` optionnel et chercher dans tous les niveaux

---

## 📊 Récapitulatif

| Problème | Sévérité | Impact | Workaround |
|----------|----------|--------|------------|
| Titre écrasé avec `where: "after"` | 🔴 CRITIQUE | Perte de contenu | Utiliser `where: "inside_start"` |
| Path hiérarchique ne match pas | 🟡 MOYEN | Ciblage limité | Utiliser regex directe |
| `heading_id` sans `level` échoue | 🟡 MOYEN | API confuse | Ajouter `level` |

---

## ✅ Ce qui fonctionne bien

### Ciblage par regex simple
```typescript
{
  target: { type: "regex", regex: { pattern: "### Le Time Blocking" } },
  where: "after"  // ⚠️ Mais écrase le match !
}
```
✅ Trouve correctement la cible (mais l'écrase)

### Options de formatage
```typescript
{
  options: { surround_with_blank_lines: 1 }
}
```
✅ Ajoute bien les sauts de ligne

### Retour diff
```typescript
{
  return: "diff"
}
```
✅ Fournit un diff clair des modifications

---

## 🔧 Améliorations recommandées

### 1. Clarifier le comportement de `where: "after"`

**Comportement actuel** :
```
Pattern: "### Title"
where: "after"
→ Remplace "### Title" puis insère
```

**Comportement attendu** :
```
Pattern: "### Title"
where: "after"
→ Préserve "### Title" puis insère après
```

**Solution** :
- Ajouter `where: "replace_match"` pour le comportement actuel
- Changer `where: "after"` pour qu'il préserve le match

### 2. Améliorer le ciblage par heading

**Options** :
- Rendre `path` plus tolérant (matching partiel)
- Permettre `heading_id` seul sans `level`
- Ajouter un mode de debug qui liste les headings disponibles en cas d'échec

### 3. Ajouter des exemples dans l'API

Pour chaque type de ciblage, fournir un exemple concret qui fonctionne.

---

## 🧪 Tests à faire

### Tests de régression

1. ✅ Insert avec regex (vérifié)
2. ❌ Insert avec heading path (échoue)
3. ❌ Insert avec heading_id (échoue)
4. ⚠️ Insert after avec regex (écrase le match)
5. ✅ Options de formatage (fonctionne)

### Tests de cas limites

- [ ] Insert au début du document (`anchor: "doc_start"`)
- [ ] Insert à la fin (`anchor: "doc_end"`)
- [ ] Replace avec regex
- [ ] Delete d'une section entière
- [ ] Multiples opérations en transaction

---

---

## ✅ Validations supplémentaires

### Opération `replace` avec regex : ✅ FONCTIONNE

**Test réalisé** :
```typescript
{
  action: "replace",
  target: { type: "regex", regex: { pattern: "### Le Multitasking\\n\\n[\\s\\S]*?(?=\\n### |\\n---)" } },
  where: "at",
  content: "### Le Multitasking 🤹\n\nAlors là, on va casser un mythe ! ..."
}
```

**Résultat** :
- ✅ Section complètement remplacée
- ✅ Titre H3 préservé dans le nouveau contenu
- ✅ Contenu suivant intact
- ✅ 1113 caractères ajoutés, 433 supprimés
- ✅ Diff clair et précis

**Impression** : 
L'opération `replace` avec `where: "at"` fonctionne **parfaitement** quand on utilise une regex qui capture tout le contenu de la section. C'est l'opération la plus fiable testée jusqu'à présent.

### ⚠️ Observation : Titre H1 de la note disparu

**Constat** :
La note commence directement par la citation `>` au lieu de `# 🚀 L'Art de la Productivité Moderne`

**Cause probable** :
- Perte lors d'une opération précédente
- Ou bug dans la création initiale
- À investiguer : est-ce lié aux opérations ou à un autre problème ?

---

## 🎯 Conclusion

L'endpoint `applyContentOperations` est **fonctionnel avec des comportements incohérents** :

**Points forts** :
- ✅ Architecture solide
- ✅ Diff clair et précis
- ✅ Options de formatage fonctionnelles
- ✅ `replace` avec `where: "at"` très fiable
- ✅ Transaction `all_or_nothing` respectée

**Points à améliorer** :
- 🔴 `where: "after"` avec regex écrase le match (CRITIQUE - perte de contenu)
- 🟡 Ciblage par heading `path` ne fonctionne pas
- 🟡 `heading_id` seul échoue (paramètres requis non documentés)
- 🟡 Incohérence entre les différents modes de ciblage

**Recommandations** :
1. **URGENT** : Corriger `where: "after"` pour préserver le match
2. Améliorer ou documenter le ciblage par heading
3. Ajouter des exemples concrets pour chaque mode de ciblage
4. Uniformiser le comportement entre regex et heading

**Opérations validées** :
- ✅ `insert` avec regex (mais attention au `where: "after"`)
- ✅ `replace` avec regex + `where: "at"` (RECOMMANDÉ)

**Opérations à tester** :
- ⏳ `delete`
- ⏳ `upsert_section`
- ⏳ Anchors (`doc_start`, `doc_end`, etc.)
- ⏳ Position offset

---

*Tests réalisés le 12 octobre 2025*  
*Note de test : f277d385-987c-43be-95df-a57bad58ef7b*

