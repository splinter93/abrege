# 🔧 Variables d'Environnement Requises

## 📋 Variables Obligatoires

### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### LLM Providers
```bash
DEEPSEEK_API_KEY=your_deepseek_api_key_here
SYNESIA_API_KEY=your_synesia_api_key_here
```

### Application
```bash
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
```

## 🚨 Erreur de Build Vercel

L'erreur `supabaseKey is required` indique que les variables d'environnement ne sont pas configurées sur Vercel.

### Solution :
1. Aller dans le dashboard Vercel
2. Sélectionner le projet
3. Aller dans Settings > Environment Variables
4. Ajouter toutes les variables ci-dessus

## 🔍 Vérification Locale

Pour vérifier que les variables sont bien définies localement :

```bash
# Créer un fichier .env.local avec les variables
cp .env.example .env.local
# Puis éditer .env.local avec les vraies valeurs
``` 