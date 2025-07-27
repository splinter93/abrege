# 🖼️ Implémentation de la fonctionnalité Header Image Offset

## 📋 Vue d'ensemble

Cette fonctionnalité permet de sauvegarder la position verticale de l'image d'en-tête d'une note. Quand l'utilisateur fait glisser l'image pour la repositionner, cette position est maintenant persistée en base de données.

## 🔧 Modifications apportées

### 1. Base de données

**Migration SQL :** `supabase/migrations/20241216_add_header_image_offset.sql`

```sql
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS header_image_offset DECIMAL(5,2) DEFAULT 50.00;

COMMENT ON COLUMN articles.header_image_offset IS 'Position verticale de l''image d''en-tête (0-100.00%)';
```

**Valeur :** 
- Type : `DECIMAL(5,2)` 
- Valeur par défaut : `50.00` (centre)
- Plage : `0.00-100.00` (pourcentage avec 2 décimales)
- `0.00%` = haut de l'image visible
- `50.00%` = centre de l'image visible  
- `100.00%` = bas de l'image visible

### 2. Types TypeScript

**Fichier :** `src/types/supabase.ts`

```typescript
export type Article = {
  // ... autres champs
  header_image_offset: number | null;
};
```

### 3. Composant EditorHeaderImage

**Fichier :** `src/components/EditorHeaderImage.tsx`

**Nouvelles props :**
```typescript
interface EditorHeaderImageProps {
  headerImageOffset?: number;           // Position initiale
  onHeaderOffsetChange?: (offset: number) => void; // Callback de sauvegarde
}
```

**Logique de sauvegarde :**
```typescript
const handleMouseUp = () => {
  // ... logique existante
  
  // Sauvegarder la nouvelle position si elle a changé
  if (onHeaderOffsetChange && imageOffsetY !== headerImageOffset) {
    onHeaderOffsetChange(imageOffsetY);
  }
};
```

### 4. API Endpoints

#### PUT `/api/v1/note/[ref]`
- Supporte `header_image_offset` dans le payload
- Validation : `z.number().min(0).max(100).optional()`

#### PATCH `/api/v1/note/[ref]/information`
- Supporte `header_image_offset` dans le payload
- Retourne `header_image_offset` dans la réponse

#### POST `/api/v1/note/create`
- Supporte `header_image_offset` dans le payload
- Valeur par défaut : `50`

#### POST `/api/v1/note/overwrite`
- Supporte `header_image_offset` dans le payload

### 5. Page de l'éditeur

**Fichier :** `src/app/(private)/note/[id]/page.tsx`

**Nouvel état :**
```typescript
const [headerImageOffset, setHeaderImageOffset] = React.useState<number>(50);
```

**Chargement initial :**
```typescript
setHeaderImageOffset((note.header_image_offset as number) || 50);
```

**Fonction de sauvegarde :**
```typescript
const handleHeaderImageOffsetSave = async (newOffset: number) => {
  if (!noteId) return;
  try {
    const payload: Record<string, unknown> = {
      header_image_offset: newOffset,
    };
    await updateNoteREST(noteId, payload);
  } catch (error) {
    console.error('[header-image-offset] Erreur lors de la sauvegarde de l\'offset:', error);
  }
};
```

**Utilisation du composant :**
```typescript
<EditorHeaderImage
  headerImageUrl={headerImageUrl}
  headerImageOffset={headerImageOffset}
  onHeaderChange={(newImage) => {
    handleHeaderImageSave(newImage);
  }}
  onHeaderOffsetChange={(newOffset) => {
    handleHeaderImageOffsetSave(newOffset);
  }}
  // ... autres props
/>
```

## 🧪 Tests

**Script de test :** `scripts/test-header-image-offset.js`

```bash
node scripts/test-header-image-offset.js
```

Le script teste :
1. ✅ Création d'une note avec `header_image_offset`
2. ✅ Mise à jour de l'offset via PUT
3. ✅ Récupération via GET information
4. ✅ Mise à jour via PATCH information

## 🚀 Utilisation

### Pour l'utilisateur
1. Ouvrir une note avec une image d'en-tête
2. Passer la souris sur l'image (curseur devient `grab`)
3. Cliquer et faire glisser pour repositionner l'image
4. Relâcher pour sauvegarder automatiquement la position
5. La position est persistée et sera restaurée au prochain chargement

### Pour le développeur
```typescript
// Créer une note avec offset personnalisé
const response = await fetch('/api/v1/note/create', {
  method: 'POST',
  body: JSON.stringify({
    source_title: 'Ma note',
    markdown_content: '# Contenu',
    header_image: 'https://example.com/image.jpg',
    header_image_offset: 75, // Position à 75%
    notebook_id: 'mon-notebook'
  })
});

// Mettre à jour l'offset
await fetch(`/api/v1/note/${noteId}`, {
  method: 'PUT',
  body: JSON.stringify({
    header_image_offset: 25
  })
});
```

## 📊 Valeurs par défaut

- **Nouvelles notes :** `50` (centre)
- **Notes existantes :** `50` (centre) - migration automatique
- **Plage valide :** `0.00-100.00`
- **Validation :** `z.number().min(0).max(100)`
- **Précision :** 2 décimales (arrondi au centième)

## 🔄 Rétrocompatibilité

- ✅ Les notes existantes utilisent `50` par défaut
- ✅ L'API accepte les requêtes sans `header_image_offset`
- ✅ Les anciens clients continuent de fonctionner
- ✅ Migration automatique via `DEFAULT 50`

## 🎯 Avantages

1. **Persistance :** La position est sauvegardée automatiquement
2. **UX améliorée :** Feedback visuel immédiat
3. **Performance :** Sauvegarde uniquement si changement
4. **Validation :** Contraintes de plage (0-100)
5. **Rétrocompatibilité :** Pas de breaking changes 