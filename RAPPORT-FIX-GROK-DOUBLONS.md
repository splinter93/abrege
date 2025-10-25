# 🔧 Fix: Grok rejetait Scrivia à cause de doublons dans `required`

## 🐛 Problème identifié

Grok (xAI) rejetait les tools Scrivia à cause de **doublons dans le array `required`** :

```json
{
  "name": "getNote",
  "parameters": {
    "properties": {
      "ref": { "type": "string" }
    },
    "required": ["ref", "ref"]  // ❌ DOUBLON - xAI rejette ça !
  }
}
```

## 🔍 Cause racine

Le code dans `openApiSchemaService.ts` ajoutait les **path parameters deux fois** :

1. **Première fois** : En parsant le path string `/note/{ref}` → extrait `ref`
2. **Deuxième fois** : En lisant `operation.parameters` qui contient aussi `ref`

```typescript
// 1. Extrait depuis le path string
const pathParams = this.extractPathParameters(pathName); // → ["ref"]
required.push(param);  // Ajoute "ref"

// 2. Lit depuis operation.parameters
for (const param of parameters) {
  if (param.required) {
    required.push(name);  // RE-ajoute "ref" ❌
  }
}
```

## ✅ Solution appliquée

Ajout d'une **déduplication** du array `required` avant de retourner les paramètres :

```typescript
// ✅ CRITICAL FIX : Dédupliquer le array required
const uniqueRequired = [...new Set(required)];

return {
  type: 'object',
  properties,
  ...(uniqueRequired.length > 0 && { required: uniqueRequired })
};
```

## 📊 Résultat

### Avant le fix

```json
{
  "name": "getNote",
  "parameters": {
    "required": ["ref", "ref"]  // ❌
  }
}
```

### Après le fix

```json
{
  "name": "getNote",
  "parameters": {
    "required": ["ref"]  // ✅
  }
}
```

## 📝 Fichiers modifiés

- ✅ `src/services/llm/openApiSchemaService.ts` (ligne 308-318)
  - Ajout de la déduplication avec `[...new Set(required)]`
  - Amélioration de la gestion des path params avec vérification de `param.in === 'path'`

## 🧪 Test

```bash
npx tsx scripts/simulate-tools-conversion.ts
```

**Résultat** : Les 3 tools Scrivia (getNote, createNote, getNoteTOC) sont maintenant générés correctement sans doublons.

## 🎯 Impact

- ✅ **Scrivia tools** devraient maintenant être acceptés par Grok/xAI
- ✅ **Pexels et Exa** continuent de fonctionner (pas impactés)
- ✅ **Tous les autres schémas OpenAPI** bénéficient aussi du fix

## 🚀 Prochaine étape

Tester dans le chat avec Grok pour confirmer que les tools Scrivia sont maintenant acceptés et fonctionnels.

