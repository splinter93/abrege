# 🔧 FIX - applyContentOperations "Payload invalide"

## 🎯 **PROBLÈME IDENTIFIÉ**

L'erreur `"Payload invalide"` pour le tool `applyContentOperations` était causée par une **incompatibilité entre la définition du tool et le schéma de validation de l'API**.

### **Erreur observée :**
```json
{
  "success": false,
  "error": "Payload invalide"
}
```

### **Cause :**
- Le LLM envoyait un payload basé sur la définition simplifiée du tool
- L'API attendait un payload conforme au schéma complexe de validation
- **Mismatch** entre les deux structures

---

## 🔍 **ANALYSE DÉTAILLÉE**

### **❌ Définition du Tool (Avant) :**
```typescript
// Structure simplifiée - INCOMPATIBLE
{
  name: 'applyContentOperations',
  parameters: {
    ops: [{
      type: 'insert' | 'delete' | 'replace',  // ❌ 'type' au lieu de 'action'
      position: number,                       // ❌ Simple position
      content: string,                        // ❌ Pas de ciblage
      length: number                          // ❌ Pas de structure target
    }]
  }
}
```

### **✅ Schéma de Validation API (Attendu) :**
```typescript
// Structure complexe - REQUISE
{
  ops: [{
    id: string,                              // ❌ MANQUANT
    action: 'insert' | 'replace' | 'delete' | 'upsert_section', // ❌ 'action' vs 'type'
    target: {                                // ❌ MANQUANT
      type: 'heading' | 'regex' | 'position' | 'anchor',
      heading: { path: string[], level: number, heading_id: string },
      regex: { pattern: string, flags: string, nth: number },
      position: { mode: 'offset' | 'start' | 'end', offset: number },
      anchor: { name: 'doc_start' | 'doc_end' | 'after_toc' | 'before_first_heading' }
    },
    where: 'before' | 'after' | 'inside_start' | 'inside_end' | 'at' | 'replace_match', // ❌ MANQUANT
    content: string,
    options: { ensure_heading: boolean, surround_with_blank_lines: number, dedent: boolean } // ❌ MANQUANT
  }]
}
```

---

## ✅ **SOLUTION IMPLÉMENTÉE**

### **Correction de la Définition du Tool :**

**Fichier modifié :** `src/services/llm/tools/ApiV2Tools.ts`

**Changements :**
1. ✅ **Structure complète** : Ajout de tous les champs requis (`id`, `action`, `target`, `where`)
2. ✅ **Ciblage précis** : Support des 4 types de ciblage (`heading`, `regex`, `position`, `anchor`)
3. ✅ **Options avancées** : Support des options de formatage
4. ✅ **Paramètres globaux** : `dry_run`, `transaction`, `conflict_strategy`, `return`

### **Nouvelle Structure :**
```typescript
{
  name: 'applyContentOperations',
  description: 'Appliquer des opérations de contenu sur une note avec ciblage précis',
  parameters: {
    ref: string,                    // ✅ Référence de la note
    ops: [{                         // ✅ Structure complète
      id: string,                   // ✅ ID unique
      action: 'insert' | 'replace' | 'delete' | 'upsert_section', // ✅ Action
      target: {                     // ✅ Ciblage précis
        type: 'heading' | 'regex' | 'position' | 'anchor',
        heading: { path: string[], level: number, heading_id: string },
        regex: { pattern: string, flags: string, nth: number },
        position: { mode: 'offset' | 'start' | 'end', offset: number },
        anchor: { name: 'doc_start' | 'doc_end' | 'after_toc' | 'before_first_heading' }
      },
      where: 'before' | 'after' | 'inside_start' | 'inside_end' | 'at' | 'replace_match', // ✅ Position
      content: string,              // ✅ Contenu
      options: {                    // ✅ Options
        ensure_heading: boolean,
        surround_with_blank_lines: number,
        dedent: boolean
      }
    }],
    dry_run: boolean,               // ✅ Mode simulation
    transaction: 'all_or_nothing' | 'best_effort', // ✅ Mode transaction
    conflict_strategy: 'fail' | 'skip', // ✅ Stratégie conflit
    return: 'content' | 'diff' | 'none' // ✅ Type retour
  }
}
```

---

## 🧪 **TESTS DE VALIDATION**

### **Exemple de Payload Valide :**

**Avant (invalide) :**
```json
{
  "ref": "note-123",
  "ops": [{
    "type": "insert",        // ❌ 'type' au lieu de 'action'
    "position": 100,         // ❌ Pas de structure target
    "content": "Nouveau contenu"
  }]
}
```

**Après (valide) :**
```json
{
  "ref": "note-123",
  "ops": [{
    "id": "op-1",            // ✅ ID unique
    "action": "insert",      // ✅ Action correcte
    "target": {              // ✅ Ciblage précis
      "type": "position",
      "position": {
        "mode": "offset",
        "offset": 100
      }
    },
    "where": "after",        // ✅ Position relative
    "content": "Nouveau contenu",
    "options": {             // ✅ Options
      "surround_with_blank_lines": 1
    }
  }],
  "dry_run": true,           // ✅ Mode simulation
  "transaction": "all_or_nothing",
  "conflict_strategy": "fail",
  "return": "diff"
}
```

---

## 🚀 **BÉNÉFICES**

### **1. Compatibilité API**
- ✅ Payload conforme au schéma de validation
- ✅ Plus d'erreur "Payload invalide"
- ✅ Fonctionnalité complète d'application de contenu

### **2. Fonctionnalités Avancées**
- ✅ **Ciblage précis** : Par heading, regex, position, ancre
- ✅ **Opérations complexes** : Insert, replace, delete, upsert_section
- ✅ **Options de formatage** : Lignes vides, déduction, headings
- ✅ **Modes de transaction** : All-or-nothing, best-effort

### **3. Robustesse**
- ✅ Validation stricte côté LLM
- ✅ Gestion des conflits
- ✅ Mode dry-run pour simulation
- ✅ Types de retour flexibles

---

## 📋 **FICHIERS MODIFIÉS**

### **✅ src/services/llm/tools/ApiV2Tools.ts**
- **Lignes 170-328** : Correction complète de la définition `applyContentOperations`
- **Impact** : Alignement avec le schéma de validation API
- **Tests** : Aucune régression détectée

---

## 🎯 **RÉSULTAT**

Le tool `applyContentOperations` est maintenant **entièrement compatible** avec l'API V2. Le LLM peut utiliser toutes les fonctionnalités avancées d'application de contenu avec ciblage précis.

**Status : ✅ CORRIGÉ ET OPÉRATIONNEL**

### **Impact :**
- ✅ Plus d'erreur "Payload invalide"
- ✅ Fonctionnalité complète d'application de contenu
- ✅ Ciblage précis par heading, regex, position, ancre
- ✅ Options avancées de formatage
- ✅ Modes de transaction et gestion des conflits
