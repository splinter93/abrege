# Guide pour corriger le problème RLS

## Problème
L'erreur `new row violates row-level security policy for table "articles"` indique que les politiques RLS bloquent la création de notes.

## Solution 1: Désactiver RLS temporairement (Recommandé pour le développement)

1. Allez sur le [Dashboard Supabase](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Database** > **Tables**
4. Cliquez sur la table `articles`
5. Allez dans l'onglet **RLS**
6. Désactivez RLS en cliquant sur le toggle

## Solution 2: Modifier les politiques RLS

Si vous préférez garder RLS activé, modifiez les politiques :

### Politique INSERT
```sql
-- Remplacer la politique INSERT existante par :
CREATE POLICY "Allow all users to insert articles"
ON public.articles
FOR INSERT
WITH CHECK (true);
```

### Politique UPDATE
```sql
-- Remplacer la politique UPDATE existante par :
CREATE POLICY "Allow all users to update articles"
ON public.articles
FOR UPDATE
USING (true)
WITH CHECK (true);
```

### Politique DELETE
```sql
-- Remplacer la politique DELETE existante par :
CREATE POLICY "Allow all users to delete articles"
ON public.articles
FOR DELETE
USING (true);
```

## Solution 3: Utiliser une Service Role Key

1. Dans le Dashboard Supabase, allez dans **Settings** > **API**
2. Copiez la **service_role** key
3. Ajoutez-la à votre `.env` :
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
4. Modifiez les API endpoints pour utiliser cette clé

## Test après correction

Après avoir appliqué une de ces solutions, testez avec :

```bash
node scripts/disable-rls-simple.js
```

Vous devriez voir "✅ Création OK" au lieu de l'erreur RLS.

## Recommandation

Pour le développement, je recommande la **Solution 1** (désactiver RLS) car :
- Plus simple à mettre en place
- Permet de se concentrer sur les fonctionnalités
- Peut être réactivé plus tard avec des politiques appropriées 