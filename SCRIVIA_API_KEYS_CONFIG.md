# 🔑 Configuration des API Keys Scrivia

## **Variables d'environnement à ajouter dans `.env.local` :**

```bash
# Configuration API Keys Scrivia
# Liste des clés API valides (séparées par des virgules)
SCRIVIA_API_KEYS=scrivia-api-key-2024,scrivia-test-key,scrivia-dev-key

# ID utilisateur par défaut pour les API Keys
# Plus tard, vous pourrez lier chaque API Key à un utilisateur spécifique
SCRIVIA_DEFAULT_USER_ID=default-user-id
```

## **Comment utiliser l'API Key :**

### **1. Dans vos requêtes HTTP :**
```bash
curl -H "X-API-Key: scrivia-api-key-2024" \
     https://scrivia.app/api/v2/folders
```

### **2. Dans ChatGPT (en attendant qu'OAuth fonctionne) :**
- Configurez l'action avec **"API Key"** au lieu d'OAuth
- Utilisez la clé : `scrivia-api-key-2024`

### **3. Dans vos tests :**
```javascript
const response = await fetch('/api/v2/folders', {
  headers: {
    'X-API-Key': 'scrivia-api-key-2024'
  }
});
```

## **Sécurité :**

- ✅ Les API Keys sont stockées dans les variables d'environnement
- ✅ Validation côté serveur
- ✅ Logs détaillés pour le debugging
- ✅ Fallback vers OAuth et JWT si l'API Key échoue

## **Ordre de priorité d'authentification :**

1. **API Key** (X-API-Key header) - **Priorité haute**
2. **OAuth 2.0** (Authorization: Bearer) - **Priorité moyenne**
3. **JWT Supabase** (Authorization: Bearer) - **Priorité basse**

## **Avantages :**

- 🚀 **Immédiat** : Fonctionne dès maintenant
- 🔄 **OAuth en standby** : Prêt quand ChatGPT sera corrigé
- 🛡️ **Sécurisé** : Validation côté serveur
- 📝 **Traçable** : Logs détaillés pour le debugging
