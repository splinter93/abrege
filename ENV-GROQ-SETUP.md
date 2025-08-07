# 🔧 Configuration Groq - Variables d'Environnement

## ✅ **PROBLÈME IDENTIFIÉ**

L'erreur 500 avec Groq est causée par des variables d'environnement manquantes.

**Variables manquantes :**
- ❌ `GROQ_API_KEY: Non défini`
- ❌ `NEXT_PUBLIC_SUPABASE_URL: Non défini`
- ❌ `SUPABASE_SERVICE_ROLE_KEY: Non défini`

---

## 🔧 **SOLUTION**

### **1. Créer le fichier `.env.local`**

Créez un fichier `.env.local` à la racine du projet avec les variables suivantes :

```bash
# 🔧 Configuration Groq
GROQ_API_KEY=gsk_votre_cle_api_groq_ici

# 🔧 Configuration Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 🔧 Configuration Together AI (optionnel)
TOGETHER_API_KEY=votre_cle_together_ai

# 🔧 Configuration DeepSeek (optionnel)
DEEPSEEK_API_KEY=votre_cle_deepseek
```

### **2. Obtenir une clé API Groq**

1. **Aller sur https://console.groq.com/**
2. **Créer un compte ou se connecter**
3. **Générer une nouvelle clé API**
4. **Copier la clé (commence par `gsk_`)**
5. **L'ajouter dans `.env.local`**

### **3. Configuration Supabase**

Si vous n'avez pas encore configuré Supabase :

1. **Aller sur https://supabase.com/**
2. **Créer un nouveau projet**
3. **Récupérer l'URL et la clé service role**
4. **Les ajouter dans `.env.local`**

---

## 🧪 **TEST DE LA CONFIGURATION**

### **1. Vérifier les variables**

```bash
node scripts/test-groq-debug.js
```

**Résultat attendu :**
```
📋 1. Vérification des variables d'environnement:
   ✅ GROQ_API_KEY: gsk_xxxxx...
   ✅ NEXT_PUBLIC_SUPABASE_URL: https://xxxxx.supabase.co
   ✅ SUPABASE_SERVICE_ROLE_KEY: eyJxxxxx...
```

### **2. Tester l'agent Groq**

1. **Sélectionner l'agent "Groq GPT-OSS"** dans l'interface
2. **Poser une question simple** : "Bonjour, comment ça va ?"
3. **Vérifier qu'il n'y a plus d'erreur 500**

---

## 🎯 **DIFFÉRENCE ENTRE LES AGENTS**

### **Agent Groq (Correct)**
```json
{
  "name": "Groq GPT-OSS",
  "model": "openai/gpt-oss-120b",
  "provider": "groq"
}
```

### **Agent Together GPT-OSS (Incorrect)**
```json
{
  "name": "GPT-OSS Minimal",
  "model": "openai/gpt-oss-120b",
  "provider": "together"
}
```

**Différence :** Le premier utilise directement l'API Groq, le second passe par Together AI.

---

## ✅ **ÉTAPES DE RÉSOLUTION**

### **1. Créer le fichier .env.local**
```bash
touch .env.local
```

### **2. Ajouter les variables**
```bash
echo "GROQ_API_KEY=gsk_votre_cle_ici" >> .env.local
echo "NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co" >> .env.local
echo "SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role" >> .env.local
```

### **3. Redémarrer le serveur**
```bash
npm run dev
```

### **4. Tester**
- Sélectionner l'agent "Groq GPT-OSS"
- Poser une question
- Vérifier qu'il n'y a plus d'erreur

---

## 🔗 **RESSOURCES**

### **📚 Documentation Officielle :**
- **Groq Console :** https://console.groq.com/
- **Supabase :** https://supabase.com/
- **Together AI :** https://together.ai/

### **🛠️ Scripts Utiles :**
- `scripts/test-groq-debug.js` - Diagnostic des problèmes
- `scripts/list-agents.js` - Liste des agents disponibles
- `scripts/create-groq-agent.js` - Créer un agent Groq

### **📋 Fichiers de Configuration :**
- `.env.local` - Variables d'environnement (à créer)
- `src/app/api/chat/llm/route.ts` - Logique de détection Groq

**🎯 Une fois les variables d'environnement configurées, Groq devrait fonctionner correctement !** 