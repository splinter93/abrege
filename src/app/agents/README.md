# 🤖 Système de Templates d'Agents

## 📖 Vue d'ensemble

Le système de templates d'agents permet de configurer et personnaliser le comportement des agents IA dans l'application Abrège. Chaque agent peut avoir ses propres paramètres LLM, instructions système, et capacités API.

## 🚀 Accès

### **Page d'accueil**
- Lien principal : **🤖 Agents & Templates** → `/agents`
- Lien de démonstration : **🧪 Demo Templates** → `/agents/demo`

### **Navigation directe**
- URL : `http://localhost:3000/agents`
- URL démo : `http://localhost:3000/agents/demo`

## 🎯 Fonctionnalités

### **1. Gestion des Agents**
- **Liste des agents** : Affichage de tous les agents disponibles
- **Sélection d'agent** : Cliquez sur un agent pour le configurer
- **Statut visuel** : Indicateur vert pour les agents actifs

### **2. Configuration des Templates**
- **Instructions système** : Définir le comportement de base de l'agent
- **Template de contexte** : Variables dynamiques pour l'adaptation
- **Personnalité** : Caractère et style de communication
- **Expertise** : Domaines de compétence de l'agent
- **Capacités** : Fonctionnalités disponibles

### **3. Paramètres LLM Configurables**
- **🤖 Modèle** : Choix entre 120B (puissant) et 20B (rapide)
- **🌡️ Temperature** : Contrôle la créativité (0.0 - 1.0)
- **📏 Max tokens** : Limite de réponse (1 - 32768)
- **🎲 Top P** : Diversité des réponses (0.0 - 1.0)
- **🔄 Streaming** : Réponses en temps réel
- **🧠 Raisonnement** : Niveau d'effort (low/medium/high)
- **🛑 Stop sequences** : Mots d'arrêt personnalisés

### **4. Capacités API v2**
- **create_note** : Création de notes
- **list_classeurs** : Liste des classeurs
- **search_notes** : Recherche dans les notes
- **move_note** : Déplacement de notes
- **update_note** : Modification de notes

## 🔧 Utilisation

### **Étape 1 : Accéder au système**
1. Allez sur la page d'accueil
2. Cliquez sur **"🤖 Agents & Templates"**

### **Étape 2 : Sélectionner un agent**
1. Dans la sidebar gauche, cliquez sur un agent
2. L'agent sélectionné sera mis en surbrillance
3. La zone de configuration s'affichera à droite

### **Étape 3 : Configurer le template**
1. **Instructions système** : Définissez le comportement de base
2. **Template de contexte** : Utilisez des variables comme `{type}`, `{name}`, `{id}`
3. **Paramètres LLM** : Ajustez selon vos besoins
4. **Capacités** : Activez/désactivez les fonctionnalités

### **Étape 4 : Tester la configuration**
1. Allez sur **"🧪 Demo Templates"** pour tester
2. Vérifiez le rendu des templates
3. Testez les paramètres LLM

## 📝 Exemples de Templates

### **Template de contexte basique**
```
Contexte: {type} - {name} (ID: {id})
Contenu: {content}
```

### **Instructions système d'un assistant**
```
Tu es un assistant spécialisé dans la gestion de notes et d'organisation personnelle. 
Tu es organisé, méthodique et toujours prêt à aider avec des conseils pratiques.
```

### **Configuration LLM recommandée**
```json
{
  "model_variant": "120b",
  "temperature": 0.7,
  "max_completion_tokens": 4096,
  "top_p": 0.9,
  "stream": true,
  "reasoning_effort": "medium"
}
```

## 🎨 Personnalisation

### **Styles CSS**
- Fichier : `src/app/agents/agents.css`
- Classes disponibles : `.agents-page`, `.agents-card`, `.agent-item`, etc.
- Responsive design intégré

### **Thèmes**
- Couleurs : Variables CSS personnalisables
- Animations : Transitions et hover effects
- Layout : Grille responsive adaptative

## 🔍 Dépannage

### **Problèmes courants**
1. **Agent non visible** : Vérifiez le statut `is_active`
2. **Configuration non sauvegardée** : Vérifiez les permissions
3. **Erreur de rendu** : Vérifiez la syntaxe des templates

### **Logs et débogage**
- Console du navigateur pour les erreurs JS
- Logs de l'API pour les erreurs serveur
- Vérification des données Supabase

## 📚 Ressources

### **Fichiers clés**
- `src/app/agents/page.tsx` : Page principale
- `src/components/agents/AgentTemplateManager.tsx` : Gestionnaire de templates
- `src/services/llm/agentTemplateService.ts` : Service de templates
- `src/types/chat.ts` : Types TypeScript

### **Documentation API**
- Endpoints v1 : `/api/v1/...`
- Endpoints v2 : `/api/v2/...`
- Documentation complète : `API-V2-COMPLETE-DOCUMENTATION.md`

## 🚀 Développement

### **Ajouter de nouveaux paramètres**
1. Mettre à jour la base de données
2. Modifier les types TypeScript
3. Mettre à jour l'interface utilisateur
4. Tester la fonctionnalité

### **Créer de nouveaux agents**
1. Insérer dans la table `agents`
2. Configurer les paramètres par défaut
3. Tester le comportement
4. Documenter les spécificités

---

**💡 Conseil** : Commencez par tester avec l'agent par défaut, puis personnalisez progressivement selon vos besoins spécifiques. 