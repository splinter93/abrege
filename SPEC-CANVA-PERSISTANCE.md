# SPÉCIFICATION - PERSISTANCE CANVA
**Date :** 11 novembre 2025  
**Version :** 1.0  
**Status :** DRAFT - À valider

---

## 🎯 PROBLÉMATIQUE

**Question fondamentale :** Un canva est-il une note créée ou un brouillon éphémère ?

**Situation actuelle (Phase 1 MVP) :**
- ✅ Canva = brouillon local (Zustand + useFileSystemStore temporaire)
- ✅ Édition complète (texte, images, formatting)
- ❌ Fermeture = perte totale du contenu
- ❌ Pas de sauvegarde automatique
- ❌ Pas de persistance entre sessions

**Besoin utilisateur :**
> "Je travaille sur un brouillon dans un canva, je ferme le chat par erreur, je perds tout mon travail → **Frustration majeure**"

---

## 📊 ANALYSE DES OPTIONS

### Option 1 : Canva = Brouillon Éphémère (Status Quo)
**Philosophie :** Le canva est un espace temporaire de rédaction rapide

**Fonctionnement :**
```
User ouvre canva → Rédige → Bouton "Sauvegarder" → Crée une note → Canva se ferme
                                                  ↓
                                          Note persistée DB
```

**Avantages :**
- ✅ Simple conceptuellement
- ✅ Pas de pollution DB (pas de notes "brouillon" jamais finalisées)
- ✅ Workflow clair : canva = temporaire, note = permanent

**Inconvénients :**
- ❌ Perte de données si crash/fermeture accidentelle
- ❌ Pas de sauvegarde auto → stress utilisateur
- ❌ Pas de "reprendre où j'en étais"

**Cas d'usage :**
- Rédaction courte (< 5 min)
- Brainstorming rapide
- LLM génère un draft qu'on sauvegarde ou rejette

---

### Option 2 : Canva = Note Temporaire (Auto-Save)
**Philosophie :** Le canva est une note avec flag `is_draft: true`

**Fonctionnement :**
```
User ouvre canva → Crée note DB (is_draft=true)
                ↓
           Auto-save toutes les 2s
                ↓
      Bouton "Publier" → is_draft=false → Note finale
      Bouton "Supprimer" → DELETE note
```

**Avantages :**
- ✅ Aucune perte de données
- ✅ Persistance entre sessions (fermer/rouvrir chat)
- ✅ Historique de modifications (via `updated_at`)
- ✅ Pas de stress utilisateur

**Inconvénients :**
- ❌ Pollution DB avec notes jamais finalisées
- ❌ Complexité gestion lifecycle (cleanup drafts vieux > 30j ?)
- ❌ Coût storage augmenté

**Cas d'usage :**
- Rédaction longue (articles, docs)
- Sessions de travail multiples
- Collaboration future (partage draft)

---

### Option 3 : Canva = LocalStorage Backup + Save Explicite (RECOMMANDÉ)
**Philosophie :** Le canva est éphémère MAIS avec backup anti-crash

**Fonctionnement :**
```
User ouvre canva → État local (Zustand)
                ↓
           Auto-backup localStorage toutes les 10s (throttlé)
                ↓
      Crash/Fermeture → Détection au prochain mount
                ↓
      Modal "Reprendre brouillon sauvegardé ?" → OUI/NON
                ↓
           Bouton "Sauvegarder" → Crée note DB → Cleanup localStorage
```

**Avantages :**
- ✅ Protection anti-crash/erreur
- ✅ Pas de pollution DB
- ✅ Workflow simple : canva = temporaire, mais récupérable
- ✅ Performance (pas d'appels API constants)
- ✅ Offline-first

**Inconvénients :**
- ⚠️ Limite taille localStorage (~5-10MB selon navigateur)
- ⚠️ Pas de sync multi-device
- ⚠️ User doit vider cache → perte backup

**Cas d'usage :**
- Tous les cas (équilibre optimal)
- Rédaction courte/moyenne
- Protection anti-frustration

---

## 🎯 RECOMMANDATION : **Option 3** (LocalStorage Backup)

**Justification :**
1. **MVP Philosophy** - Pas de over-engineering, pas de DB bloat
2. **User Safety** - Protection anti-crash suffisante pour 99% des cas
3. **Performance** - Pas d'appels API constants
4. **Scalabilité** - Facile d'upgrader vers Option 2 plus tard si besoin

---

## 🛠️ IMPLÉMENTATION DÉTAILLÉE

### Architecture

```typescript
// src/services/canvaBackupService.ts
export class CanvaBackupService {
  private static STORAGE_KEY = 'scrivia_canva_backups';
  private static MAX_BACKUPS = 5;
  private static BACKUP_EXPIRY_DAYS = 7;

  /**
   * Sauvegarder un canva dans localStorage
   * Throttlé automatiquement (max 1 save/10s)
   */
  static saveBackup(session: CanvaSession): void {
    const backups = this.getBackups();
    const now = new Date().toISOString();
    
    // Ajouter ou mettre à jour le backup
    backups[session.id] = {
      session,
      savedAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    // Cleanup vieux backups
    this.cleanupExpiredBackups(backups);
    
    // Limiter à MAX_BACKUPS
    const sortedBackups = Object.entries(backups)
      .sort(([, a], [, b]) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      .slice(0, this.MAX_BACKUPS);
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Object.fromEntries(sortedBackups)));
  }

  /**
   * Récupérer tous les backups valides
   */
  static getBackups(): Record<string, CanvaBackup> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return {};
      
      const backups = JSON.parse(stored);
      this.cleanupExpiredBackups(backups);
      return backups;
    } catch (error) {
      logger.error('[CanvaBackupService] Failed to load backups', error);
      return {};
    }
  }

  /**
   * Supprimer un backup après sauvegarde réussie
   */
  static deleteBackup(sessionId: string): void {
    const backups = this.getBackups();
    delete backups[sessionId];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(backups));
  }

  /**
   * Détecter backups récupérables au mount
   */
  static hasRecoverableBackups(): boolean {
    const backups = this.getBackups();
    return Object.keys(backups).length > 0;
  }

  private static cleanupExpiredBackups(backups: Record<string, CanvaBackup>): void {
    const now = Date.now();
    Object.keys(backups).forEach(id => {
      if (new Date(backups[id].expiresAt).getTime() < now) {
        delete backups[id];
      }
    });
  }
}

interface CanvaBackup {
  session: CanvaSession;
  savedAt: string;
  expiresAt: string;
}
```

### Modifications useCanvaStore

```typescript
// src/store/useCanvaStore.ts
import { CanvaBackupService } from '@/services/canvaBackupService';
import { throttle } from '@/utils/throttle';

export const useCanvaStore = create<CanvaStore>((set, get) => ({
  // ... état existant ...

  // Nouveau : Backup throttlé (max 1/10s)
  _throttledBackup: throttle((sessionId: string) => {
    const session = get().sessions[sessionId];
    if (session) {
      CanvaBackupService.saveBackup(session);
      logger.debug('[CanvaStore] Backup saved', { sessionId });
    }
  }, 10000), // 10s

  updateSession: (sessionId, updates) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      const merged: CanvaSession = {
        ...session,
        ...updates,
        lastUpdatedAt: new Date().toISOString()
      };

      // Déclencher backup throttlé
      setTimeout(() => get()._throttledBackup(sessionId), 0);

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: merged
        }
      };
    });
  },

  // Nouveau : Restaurer depuis backup
  restoreFromBackup: (backupId: string) => {
    const backup = CanvaBackupService.getBackups()[backupId];
    if (!backup) return;

    set((state) => ({
      sessions: {
        ...state.sessions,
        [backup.session.id]: backup.session
      },
      activeCanvaId: backup.session.id,
      isCanvaOpen: true
    }));

    logger.info('[CanvaStore] Restored from backup', { sessionId: backup.session.id });
  },

  // Amélioration closeCanva : cleanup backup
  closeCanva: (sessionId) => {
    const { activeCanvaId } = get();
    const targetId = sessionId || activeCanvaId;
    if (!targetId) return;

    // Cleanup backup
    CanvaBackupService.deleteBackup(targetId);

    set((state) => {
      // ... logique existante ...
    });
  }
}));
```

### Composant RecoverBackupModal

```typescript
// src/components/chat/RecoverBackupModal.tsx
'use client';

import React from 'react';
import { CanvaBackupService } from '@/services/canvaBackupService';
import { useCanvaStore } from '@/store/useCanvaStore';

export const RecoverBackupModal: React.FC = () => {
  const [backups, setBackups] = React.useState<Record<string, any>>({});
  const [isOpen, setIsOpen] = React.useState(false);
  const { restoreFromBackup } = useCanvaStore();

  React.useEffect(() => {
    // Vérifier backups au mount
    if (CanvaBackupService.hasRecoverableBackups()) {
      setBackups(CanvaBackupService.getBackups());
      setIsOpen(true);
    }
  }, []);

  if (!isOpen || Object.keys(backups).length === 0) return null;

  return (
    <div className="canva-recovery-modal">
      <div className="canva-recovery-content">
        <h3>📝 Brouillons récupérables</h3>
        <p>Nous avons détecté {Object.keys(backups).length} brouillon(s) non sauvegardé(s).</p>
        
        <ul>
          {Object.entries(backups).map(([id, backup]) => (
            <li key={id}>
              <strong>{backup.session.title}</strong>
              <span>Sauvegardé {new Date(backup.savedAt).toLocaleString('fr-FR')}</span>
              <button onClick={() => {
                restoreFromBackup(id);
                setIsOpen(false);
              }}>
                Restaurer
              </button>
              <button onClick={() => {
                CanvaBackupService.deleteBackup(id);
                const newBackups = { ...backups };
                delete newBackups[id];
                setBackups(newBackups);
                if (Object.keys(newBackups).length === 0) {
                  setIsOpen(false);
                }
              }}>
                Supprimer
              </button>
            </li>
          ))}
        </ul>

        <button onClick={() => setIsOpen(false)}>
          Fermer
        </button>
      </div>
    </div>
  );
};
```

### Bouton "Sauvegarder" dans ChatCanvaPane

```typescript
// src/components/chat/ChatCanvaPane.tsx
const handleSaveAsNote = useCallback(async () => {
  if (!session || !note) return;

  try {
    setIsSaving(true);

    // Créer la note via API
    const result = await optimizedApi.createNote({
      source_title: note.source_title,
      markdown_content: note.markdown_content,
      header_image: note.header_image,
      notebook_id: classeurId, // Demander à l'user via modal
      folder_id: folderId // Optionnel
    });

    // Cleanup backup + fermer canva
    CanvaBackupService.deleteBackup(session.id);
    closeCanva(session.id);

    // Feedback success
    toast.success('Note sauvegardée avec succès !');
    
    // Optionnel : rediriger vers la note
    router.push(`/private/note/${result.note.slug}`);

  } catch (error) {
    logger.error('[ChatCanvaPane] Failed to save note', error);
    toast.error('Erreur lors de la sauvegarde');
  } finally {
    setIsSaving(false);
  }
}, [session, note, closeCanva]);

// Ajouter dans le render
<button 
  onClick={handleSaveAsNote}
  className="canva-save-btn"
  disabled={isSaving || !note.markdown_content}
>
  {isSaving ? 'Sauvegarde...' : 'Sauvegarder la note'}
</button>
```

---

## 📋 CHECKLIST IMPLÉMENTATION

### Phase 1 : Backup LocalStorage (Priorité Haute - 6h)
- [ ] Créer `CanvaBackupService` (2h)
  - [ ] `saveBackup` avec throttle
  - [ ] `getBackups` avec cleanup expired
  - [ ] `deleteBackup`
  - [ ] Tests unitaires
- [ ] Modifier `useCanvaStore` (1h)
  - [ ] Intégrer backup throttlé dans `updateSession`
  - [ ] `restoreFromBackup` action
  - [ ] Cleanup dans `closeCanva`
- [ ] Créer `RecoverBackupModal` (2h)
  - [ ] UI liste backups
  - [ ] Actions restaurer/supprimer
  - [ ] Intégration ChatFullscreenV2
- [ ] Bouton "Sauvegarder" dans ChatCanvaPane (1h)
  - [ ] Modal choisir classeur/dossier destination
  - [ ] Appel API `createNote`
  - [ ] Cleanup backup + close canva

### Phase 2 : UX Améliorations (Nice-to-have - 3h)
- [ ] Auto-save indicator (icône nuage sync)
- [ ] Confirmation avant fermeture si contenu non vide
- [ ] Keyboard shortcut Cmd+S → Sauvegarder
- [ ] Toast "Brouillon sauvegardé localement"

### Phase 3 : Évolution Future (Option 2) (8h+)
- [ ] Migration vers notes `is_draft: true` en DB
- [ ] Sync multi-device via Supabase Realtime
- [ ] Versioning (historique modifications)

---

## 🎯 DÉCISION FINALE

**Approche recommandée : Option 3 (LocalStorage Backup)**

**Workflow utilisateur :**
1. User ouvre canva → Rédige
2. Auto-backup localStorage toutes les 10s (transparent)
3. User ferme chat → Backup conservé 7 jours
4. User rouvre chat → Modal "Reprendre brouillon ?" → OUI
5. User termine rédaction → Bouton "Sauvegarder" → Crée note DB → Cleanup backup

**Avantages MVP :**
- ✅ Protection anti-crash
- ✅ Pas de pollution DB
- ✅ Offline-first
- ✅ Simple à implémenter (6h)
- ✅ Évolutif vers Option 2 si besoin

**Limites acceptables :**
- ⚠️ Pas de sync multi-device (acceptable MVP)
- ⚠️ Limite taille localStorage (suffisant pour texte, images base64 moyennes)
- ⚠️ User vide cache → perte backup (rare, acceptable)

---

## 🚀 NEXT STEPS

1. **Valider cette spec** avec le founder
2. **Implémenter Phase 1** (6h) avant Phase 2 (LLM Context)
3. **Tester scenarios :**
   - Rédaction → Fermeture → Réouverture → Restauration
   - Rédaction → Sauvegarde → Vérifier note créée
   - Rédaction longue → Vérifier backups throttlés (pas 100 writes/sec)
   - Crash tab → Réouverture → Modal recovery

---

**Auteur :** Jean-Claude (AI Senior Dev)  
**Standard :** GAFAM Production  
**Mantra :** "Debuggable à 3h avec 10K users ?"  
**Réponse :** 🟢 OUI avec Option 3

