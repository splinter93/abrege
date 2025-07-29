# Comment obtenir la Service Role Key

## Étapes

1. **Allez sur le Dashboard Supabase**
   - Ouvrez [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Connectez-vous à votre compte

2. **Sélectionnez votre projet**
   - Cliquez sur votre projet `abrege`

3. **Accédez aux paramètres API**
   - Dans le menu de gauche, cliquez sur **Settings**
   - Puis cliquez sur **API**

4. **Copiez la Service Role Key**
   - Vous verrez deux clés :
     - `anon` `public` (celle que vous utilisez actuellement)
     - `service_role` `secret` (celle dont vous avez besoin)
   - Copiez la **service_role** key

5. **Ajoutez-la à votre .env**
   ```bash
   echo "SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key_ici" >> .env
   ```

6. **Redémarrez votre serveur de développement**
   ```bash
   npm run dev
   ```

## ⚠️ Attention

La service role key a des privilèges élevés et contourne RLS. Utilisez-la uniquement pour le développement ou dans des contextes sécurisés.

## Alternative plus sûre

Si vous préférez ne pas utiliser la service role key, désactivez simplement RLS dans le dashboard Supabase comme décrit dans `manual-rls-fix.md`. 