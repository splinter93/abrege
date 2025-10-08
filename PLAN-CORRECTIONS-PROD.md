# 🔧 PLAN DE CORRECTIONS PRÉ-PRODUCTION

## 📋 Vue d'Ensemble

**Document** : Plan d'action pour corrections critiques  
**Date** : 8 octobre 2025  
**Temps estimé total** : 2-3 heures  
**Priorité** : CRITIQUE avant déploiement

---

## 🚨 CORRECTIONS CRITIQUES (BLOQUANTES)

### 1️⃣ Corriger les Erreurs TypeScript (10 erreurs)
**Temps estimé** : 60-90 minutes  
**Priorité** : 🔴 CRITIQUE

#### Stratégie Recommandée : Simplification du Type

```typescript
// ❌ AVANT (problématique)
export interface FullEditorInstance extends TiptapEditor {
  storage: {
    markdown?: MarkdownStorage;
    [key: string]: unknown;
  };
}

// ✅ APRÈS (solution propre)
import type { Editor } from '@tiptap/react';

// 1. Remplacer tous les FullEditorInstance par Editor
// 2. Créer un type helper pour le storage markdown

type EditorWithMarkdown = Editor & {
  storage: Editor['storage'] & {
    markdown?: {
      getMarkdown?: () => string;
    };
  };
};

// 3. Utiliser ce type uniquement où nécessaire
const getMarkdown = (editor: Editor): string => {
  const storage = editor.storage as any;
  return storage?.markdown?.getMarkdown?.() || '';
};
```

#### Fichiers à Modifier

**1. `/src/types/editor.ts`**
```typescript
// Simplifier l'interface
import type { Editor as TiptapEditor } from '@tiptap/react';

export type FullEditorInstance = TiptapEditor;

// Helper pour accès sécurisé au markdown storage
export function getEditorMarkdown(editor: TiptapEditor | null): string {
  if (!editor) return '';
  try {
    const storage = editor.storage as any;
    return storage?.markdown?.getMarkdown?.() || '';
  } catch {
    return '';
  }
}
```

**2. `/src/components/editor/Editor.tsx`**

Modifications à faire :
```typescript
// Ligne 262-276 : handleEditorUpdate
const handleEditorUpdate = React.useCallback(({ editor }: { editor: Editor }) => {
  if (!editor || editorState.internal.isUpdatingFromStore) return;
  
  try {
    const nextMarkdown = getEditorMarkdown(editor);
    if (nextMarkdown !== content) {
      const cleanMarkdown = cleanEscapedMarkdown(nextMarkdown);
      updateNote(noteId, { markdown_content: cleanMarkdown });
    }
  } catch (error) {
    logger.error(LogCategory.EDITOR, 'Erreur lors de la mise à jour du contenu:', error);
  }
}, [content, noteId, updateNote, editorState]);

// Ligne 373-385 : handleSave
const { handleSave } = useEditorSave({
  editor: editor ? {
    getHTML: () => editor.getHTML(),
    storage: { 
      markdown: { 
        getMarkdown: () => getEditorMarkdown(editor)
      } 
    }
  } : undefined,
  onSave: async ({ title: newTitle, markdown_content, html_content }) => {
    await v2UnifiedApi.updateNote(noteId, {
      source_title: newTitle ?? editorState.document.title ?? 'Untitled',
      markdown_content,
      html_content,
    }, userId);
  }
});

// Ligne 583-591 : contentHash
const contentHash = React.useMemo(() => {
  if (!editor) return 0;
  try {
    const markdown = getEditorMarkdown(editor);
    return hashString(markdown);
  } catch {
    return hashString(content || '');
  }
}, [editor, content, editorState.document.forceTOCUpdate]);

// Retirer tous les `as any` pour les props editor
// Lignes 802, 890, 904, 908, 940, 979, 989
```

#### Checklist
- [ ] Modifier `/src/types/editor.ts`
- [ ] Ajouter fonction helper `getEditorMarkdown`
- [ ] Modifier `handleEditorUpdate` dans Editor.tsx
- [ ] Modifier `handleSave` dans Editor.tsx
- [ ] Modifier `contentHash` dans Editor.tsx
- [ ] Retirer tous les casts `as any` (8 occurrences)
- [ ] Vérifier compilation : `npm run type-check`
- [ ] Tester l'éditeur en dev

---

### 2️⃣ Migrer slashCommands.js → .ts
**Temps estimé** : 30 minutes  
**Priorité** : 🔴 CRITIQUE

#### Actions
```bash
# 1. Renommer le fichier
mv src/components/slashCommands.js src/components/slashCommands.ts

# 2. Ajouter les types
```

**Fichier : `/src/components/slashCommands.ts`**
```typescript
import type { Editor } from '@tiptap/react';

export interface SlashCommand {
  id: string;
  label: Record<'fr' | 'en', string>;
  alias: Record<'fr' | 'en', string[]>;
  description: Record<'fr' | 'en', string>;
  action: (editor: Editor) => void | boolean;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'h1',
    label: { fr: 'Heading 1', en: 'Heading 1' },
    alias: { fr: ['/t1', '/titre1', '/h1'], en: ['/h1', '/heading1', '/title1'] },
    description: { fr: 'Titre principal de la page', en: 'Main page heading' },
    action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  // ... reste des commandes
];
```

#### Checklist
- [ ] Renommer le fichier en .ts
- [ ] Ajouter l'interface SlashCommand
- [ ] Typer toutes les commandes
- [ ] Importer Editor depuis @tiptap/react
- [ ] Vérifier que SlashMenu.tsx importe correctement
- [ ] Vérifier compilation

---

### 3️⃣ Nettoyage Code Debug
**Temps estimé** : 15 minutes  
**Priorité** : 🔴 CRITIQUE

#### Actions

**1. Retirer LinkDebugger**
```typescript
// src/components/editor/Editor.tsx
// Ligne 13 : Retirer l'import
- import LinkDebugger from '@/components/debug/LinkDebugger';

// Lignes 760-761 : Retirer le composant
- {/* 🔍 Debug: Vérifier les liens */}
- <LinkDebugger />
```

**2. Retirer console.log**
```bash
# Trouver tous les console.log
grep -r "console\.log" src/components/editor/

# Fichiers à nettoyer :
- Editor.tsx (lignes 358, 937, 941)
- EditorSyncManager.tsx
- EditorShareManager.tsx

# Les remplacer par logger.debug (qui n'affiche qu'en dev)
```

**3. Retirer commentaires debug**
```typescript
// src/components/editor/FloatingMenuNotion.tsx
// Lignes 249-257 : Retirer les commentaires
- // Debug: afficher le menu même si invisible pour tester
- // Debug: forcer l'affichage pour tester
```

#### Checklist
- [ ] Retirer LinkDebugger import et usage
- [ ] Remplacer console.log par logger.debug (3 occurrences)
- [ ] Retirer commentaires debug de FloatingMenuNotion.tsx
- [ ] Vérifier qu'aucun console.log ne reste : `grep -r "console\." src/components/editor/`

---

### 4️⃣ Vérification Finale
**Temps estimé** : 15-30 minutes  
**Priorité** : 🔴 CRITIQUE

#### Actions
```bash
# 1. Compilation TypeScript
npm run type-check
# Attendu : 0 erreurs

# 2. Linting
npm run lint src/components/editor/
# Attendu : 0 erreurs critiques

# 3. Build production
npm run build
# Attendu : Succès

# 4. Tests manuels en dev
npm run dev
# Tester :
- Création de note
- Édition avec slash commands
- Menu flottant
- TOC
- Partage
- Sauvegarde automatique
```

#### Checklist Tests Manuels
- [ ] Créer une nouvelle note
- [ ] Taper `/` et sélectionner une commande
- [ ] Sélectionner du texte → menu flottant apparaît
- [ ] Vérifier TOC se met à jour
- [ ] Tester drag handles sur les blocs
- [ ] Ouvrir menu partage
- [ ] Sauvegarder et recharger la page
- [ ] Vérifier que le contenu est restauré

---

## 📝 CORRECTIONS RECOMMANDÉES (NON-BLOQUANTES)

### 5️⃣ Ajouter TOC Active Highlight
**Temps estimé** : 45 minutes  
**Priorité** : 🟡 RECOMMANDÉ

```typescript
// src/components/TableOfContents.tsx
import { useEffect, useState } from 'react';

export const TableOfContents: React.FC<Props> = ({ headings, containerRef }) => {
  const [activeId, setActiveId] = useState<string>('');
  
  useEffect(() => {
    if (!containerRef?.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            setActiveId(id);
          }
        });
      },
      { 
        rootMargin: '-80px 0px -80% 0px',
        threshold: 0.5
      }
    );
    
    // Observer tous les headings
    const headingElements = containerRef.current.querySelectorAll('h2, h3');
    headingElements.forEach(el => observer.observe(el));
    
    return () => observer.disconnect();
  }, [containerRef]);
  
  return (
    <nav className="editor-toc">
      {headings.map(h => (
        <button
          key={h.id}
          className={`editor-toc-item ${h.id === activeId ? 'active' : ''}`}
          onClick={() => scrollToHeading(h.id)}
        >
          {h.text}
        </button>
      ))}
    </nav>
  );
};
```

---

### 6️⃣ Enrichir ShareMenu
**Temps estimé** : 60 minutes  
**Priorité** : 🟡 RECOMMANDÉ

Fonctionnalités à ajouter :
- [ ] Confirmation modale pour passage en public
- [ ] Expiration de lien (24h, 7j, 30j, jamais)
- [ ] Protection par mot de passe
- [ ] Preview de l'URL avant publication
- [ ] Copie du lien avec query params (tracking)

---

### 7️⃣ Implémenter Tests Unitaires
**Temps estimé** : 2-3 heures  
**Priorité** : 🟢 NICE-TO-HAVE

```bash
# Setup Jest + React Testing Library
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Créer les tests
tests/
  components/
    editor/
      Editor.test.tsx
      SlashMenu.test.tsx
      FloatingMenuNotion.test.tsx
      ShareMenu.test.tsx
```

---

## 🎯 ORDRE D'EXÉCUTION

### Phase 1 : Corrections Critiques (2-3h)
1. ✅ Corriger erreurs TypeScript (60-90min)
2. ✅ Migrer slashCommands.js (30min)
3. ✅ Nettoyage code debug (15min)
4. ✅ Vérification finale (30min)

### Phase 2 : Tests en Staging (1h)
1. Déployer sur environnement de staging
2. Tests smoke complets
3. Tests de régression
4. Validation QA

### Phase 3 : Déploiement Production (30min)
1. Backup base de données
2. Déploiement avec rollback plan
3. Monitoring des erreurs (Sentry)
4. Tests post-déploiement

---

## 📊 SUIVI

| Tâche | Status | Temps Prévu | Temps Réel | Notes |
|-------|--------|-------------|------------|-------|
| Erreurs TS | ⏳ | 90min | - | - |
| Migration JS→TS | ⏳ | 30min | - | - |
| Nettoyage debug | ⏳ | 15min | - | - |
| Vérification | ⏳ | 30min | - | - |
| **TOTAL** | **⏳** | **2h45** | **-** | **-** |

---

## ✅ VALIDATION FINALE

Avant de marquer comme prêt pour production :

- [ ] ✅ 0 erreurs TypeScript
- [ ] ✅ 0 erreurs ESLint critiques
- [ ] ✅ Build production réussit
- [ ] ✅ Tous les console.log retirés
- [ ] ✅ Code debug retiré
- [ ] ✅ Tests manuels passent
- [ ] ✅ Pas de régression fonctionnelle
- [ ] ✅ Performance acceptable (< 2s TTI)

---

## 📞 CONTACT & SUPPORT

En cas de problème pendant les corrections :
1. Vérifier ce document
2. Consulter `AUDIT-EDITEUR-PRODUCTION.md`
3. Check les docs : `docs/DRAG-HANDLES-AUDIT.md`

---

*Document créé le 8 octobre 2025*  
*Dernière mise à jour : 8 octobre 2025*

