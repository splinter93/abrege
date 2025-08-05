# 🤖 Tools LLM - API v2 Scrivia - Documentation Complète

## 🎯 Vue d'ensemble

L'API v2 de Scrivia expose **28 tools LLM** pour permettre aux agents intelligents (ChatGPT, DeepSeek, etc.) d'interagir de manière optimale avec la plateforme. Chaque tool est parfaitement structuré avec des descriptions claires et des paramètres explicites.

---

## 📊 **STATISTIQUES GLOBALES**

- **Total endpoints v2 :** 28
- **Total tools LLM :** 28
- **Couverture :** 100% ✅
- **Descriptions optimisées :** 100% ✅
- **Paramètres structurés :** 100% ✅

---

## 📝 **GESTION DES NOTES (16 tools)**

### **1. create_note**
**Créer une nouvelle note structurée dans un classeur spécifique (par ID ou slug), avec un titre obligatoire, un contenu markdown optionnel, et un dossier parent facultatif. La note sera automatiquement positionnée dans l'ordre du classeur.**

**Paramètres :**
- `source_title` (string, **obligatoire**) : Titre de la note (max 255 caractères)
- `notebook_id` (string, **obligatoire**) : ID ou slug du classeur
- `markdown_content` (string, optionnel) : Contenu markdown
- `folder_id` (string, optionnel) : ID du dossier parent

### **2. update_note**
**Modifier une note existante identifiée par son ID ou slug, pour changer son titre, contenu markdown, description ou dossier parent (sans écraser les autres champs non spécifiés). Les champs non fournis restent inchangés.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug de la note
- `source_title` (string, optionnel) : Nouveau titre
- `markdown_content` (string, optionnel) : Nouveau contenu markdown

### **3. delete_note**
**Supprimer définitivement une note et tout son contenu de la base de données. Cette action est irréversible et ne peut pas être annulée. La note disparaîtra de tous les classeurs et dossiers.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug de la note

### **4. get_note_content**
**Récupérer le contenu markdown et HTML d'une note, avec toutes ses métadonnées (titre, image d'en-tête, dates de création/modification, visibilité). Permet d'analyser le contenu existant avant modification.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug de la note

### **5. get_note_metadata**
**Récupérer les métadonnées d'une note sans son contenu complet. Inclut les informations sur le classeur et le dossier parents.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug de la note

### **6. add_content_to_note**
**Ajouter du texte markdown à la fin du contenu d'une note existante, sans remplacer le contenu existant. Le nouveau contenu sera concaténé après le contenu actuel.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug de la note
- `content` (string, **obligatoire**) : Contenu markdown à ajouter

### **7. insert_content_to_note**
**Insérer du contenu markdown à une position spécifique dans une note existante, sans remplacer le contenu existant. Le nouveau contenu sera inséré à l'index spécifié.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug de la note
- `content` (string, **obligatoire**) : Contenu markdown à insérer
- `position` (number, **obligatoire**) : Position d'insertion (0 = début)

### **8. add_content_to_section**
**Ajouter du contenu markdown à une section spécifique d'une note (basée sur les titres markdown). Le contenu sera ajouté à la fin de la section existante.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug de la note
- `sectionId` (string, **obligatoire**) : ID ou titre de la section
- `content` (string, **obligatoire**) : Contenu markdown à ajouter

### **9. clear_section**
**Vider le contenu d'une section spécifique d'une note (basée sur les titres markdown). La section reste mais son contenu est supprimé.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug de la note
- `sectionId` (string, **obligatoire**) : ID ou titre de la section

### **10. erase_section**
**Supprimer complètement une section et son contenu d'une note (basée sur les titres markdown). La section et tout son contenu disparaissent.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug de la note
- `sectionId` (string, **obligatoire**) : ID ou titre de la section

### **11. get_table_of_contents**
**Récupérer la table des matières d'une note basée sur les titres markdown. Permet d'analyser la structure d'une note avant modification.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug de la note

### **12. get_note_statistics**
**Récupérer les statistiques détaillées d'une note (nombre de caractères, mots, lignes, sections). Permet d'analyser la complexité d'une note.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug de la note

### **13. merge_note**
**Fusionner le contenu d'une note dans une autre note selon une stratégie spécifique (append, prepend, replace), puis supprimer la note source.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug de la note source
- `targetNoteId` (string, **obligatoire**) : ID de la note de destination
- `mergeStrategy` (string, **obligatoire**) : Stratégie de fusion (`append`, `prepend`, `replace`)

### **14. move_note**
**Déplacer une note d'un dossier vers un autre dossier spécifique, ou la sortir d'un dossier vers la racine du classeur. La note conserve son contenu et ses métadonnées.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug de la note
- `folder_id` (string, **obligatoire**) : ID du dossier de destination (null pour la racine)

### **15. publish_note**
**Changer la visibilité d'une note (public/private) et générer une URL publique. Permet de rendre une note accessible publiquement.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug de la note
- `ispublished` (boolean, **obligatoire**) : Statut de publication

### **16. get_note_insights**
**Récupérer les insights AI et embeddings d'une note pour l'analyse LLM. Inclut le résumé automatique et les tags.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug de la note

---

## 📁 **GESTION DES DOSSIERS (5 tools)**

### **17. create_folder**
**Créer un nouveau dossier avec un nom obligatoire dans un classeur spécifique, avec dossier parent optionnel. Le dossier sera automatiquement positionné dans l'ordre du classeur ou du dossier parent.**

**Paramètres :**
- `name` (string, **obligatoire**) : Nom du dossier (max 255 caractères)
- `notebook_id` (string, **obligatoire**) : ID du classeur
- `parent_id` (string, optionnel) : ID du dossier parent (null pour la racine)

### **18. update_folder**
**Modifier le nom ou le dossier parent d'un dossier existant identifié par son ID ou slug. Les champs non fournis restent inchangés. Le déplacement vers un nouveau parent réorganise la hiérarchie.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug du dossier
- `name` (string, optionnel) : Nouveau nom (max 255 caractères)
- `parent_id` (string, optionnel) : ID du nouveau dossier parent (null pour la racine)

### **19. delete_folder**
**Supprimer définitivement un dossier vide (sans sous-dossiers ni notes) de la base de données. Cette action est irréversible. Les dossiers contenant des éléments ne peuvent pas être supprimés.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug du dossier

### **20. get_folder_tree**
**Récupérer l'arborescence complète d'un dossier : sous-dossiers et notes organisés hiérarchiquement. Permet de comprendre la structure d'un dossier.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug du dossier

### **21. move_folder**
**Déplacer un dossier vers un nouveau dossier parent ou vers la racine du classeur. Réorganise automatiquement la hiérarchie.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug du dossier
- `parent_id` (string, **obligatoire**) : ID du nouveau dossier parent (null pour la racine)

---

## 📚 **GESTION DES CLASSEURS (6 tools)**

### **22. create_notebook**
**Créer un nouveau classeur avec un nom obligatoire, description et icône optionnelles. Le classeur sera automatiquement positionné à la fin de la liste des classeurs de l'utilisateur.**

**Paramètres :**
- `name` (string, **obligatoire**) : Nom du classeur (max 255 caractères)
- `description` (string, optionnel) : Description (max 500 caractères)
- `icon` (string, optionnel) : Icône (emoji ou nom d'icône)

### **23. update_notebook**
**Modifier le nom, description ou icône d'un classeur existant identifié par son ID ou slug. Les champs non fournis restent inchangés. Le nom et la description peuvent être modifiés indépendamment.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug du classeur
- `name` (string, optionnel) : Nouveau nom (max 255 caractères)
- `description` (string, optionnel) : Nouvelle description (max 500 caractères)
- `icon` (string, optionnel) : Nouvelle icône (emoji ou nom d'icône)

### **24. delete_notebook**
**Supprimer définitivement un classeur et tout son contenu (dossiers et notes) de la base de données. Cette action est irréversible et supprime toutes les données associées au classeur.**

**Paramètres :**
- `ref` (string, **obligatoire**) : ID ou slug du classeur

### **25. get_tree**
**Récupérer l'arborescence complète d'un classeur : dossiers, sous-dossiers et notes organisés hiérarchiquement. Permet de comprendre la structure avant d'ajouter ou déplacer des éléments.**

**Paramètres :**
- `notebook_id` (string, **obligatoire**) : ID du classeur

### **26. reorder_notebooks**
**Réorganiser l'ordre des classeurs de l'utilisateur selon une nouvelle séquence spécifiée. Permet de personnaliser l'ordre d'affichage.**

**Paramètres :**
- `classeurs` (array, **obligatoire**) : Liste des classeurs avec leurs nouvelles positions
  - `id` (string) : ID du classeur
  - `position` (number) : Nouvelle position (0 = premier)

### **27. get_notebooks**
**Récupérer la liste complète des classeurs de l'utilisateur avec leurs métadonnées (nom, description, icône, position). Permet de choisir le bon classeur avant de créer des notes ou dossiers.**

**Paramètres :** Aucun

---

## 🔧 **UTILITAIRES (1 tool)**

### **28. generate_slug**
**Générer un slug unique basé sur un texte pour les notes, classeurs ou dossiers. Permet de créer des identifiants URL-friendly.**

**Paramètres :**
- `text` (string, **obligatoire**) : Texte à partir duquel générer le slug
- `type` (string, **obligatoire**) : Type d'élément (`note`, `classeur`, `folder`)

---

## 🎯 **INTÉGRATION LLM**

### **Utilisation avec ChatGPT**
```javascript
const tools = agentApiV2Tools.getToolsForFunctionCalling();

// Configuration ChatGPT
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    {
      role: "user",
      content: "Crée une note sur les meilleures pratiques de développement"
    }
  ],
  tools: tools,
  tool_choice: "auto"
});
```

### **Utilisation avec DeepSeek**
```javascript
// Configuration DeepSeek
const response = await deepseek.chat.completions.create({
  model: "deepseek-chat",
  messages: [
    {
      role: "user", 
      content: "Organise mes notes de projet"
    }
  ],
  tools: tools,
  tool_choice: "auto"
});
```

---

## 🔒 **SÉCURITÉ ET PERMISSIONS**

### **Authentification**
- ✅ Tous les tools nécessitent un JWT token valide
- ✅ Validation automatique des permissions utilisateur
- ✅ Isolation des données par utilisateur

### **Validation**
- ✅ Validation stricte des paramètres avec Zod
- ✅ Gestion d'erreur détaillée
- ✅ Logging sécurisé (tokens masqués)

---

## 📈 **PERFORMANCE**

### **Optimisations**
- ✅ Accès direct à la base de données
- ✅ Pas de dépendance à `optimizedApi`
- ✅ Logging optimisé pour le debugging
- ✅ Gestion d'erreur robuste

### **Monitoring**
- ✅ Métriques de performance
- ✅ Logs détaillés par opération
- ✅ Traçabilité complète

---

## 🎉 **RÉSULTAT FINAL**

**✅ COUVERTURE COMPLÈTE :** Tous les 28 endpoints v2 sont parfaitement intégrés dans les tools LLM

**✅ DESCRIPTIONS OPTIMISÉES :** Chaque tool a une description claire et orientée métier

**✅ PARAMÈTRES STRUCTURÉS :** Tous les paramètres sont typés et documentés

**✅ SÉCURITÉ MAXIMALE :** Authentification et validation strictes

**✅ PRÊT POUR LA PRODUCTION :** API v2 Scrivia est parfaitement optimisée pour les LLMs ! 🚀

---

*Documentation générée le 2024-01-01 - Version 2.0* 