# 🎭 Vision : Personnification des Agents - Scrivia

> **"Vous ne parlez pas à ChatGPT. Vous parlez à Timothy Cavendish."**

---

## 📋 Table des matières

1. [Concept](#concept)
2. [Les 4 Agents Iconiques](#les-4-agents-iconiques)
3. [Capacités de Personnalisation](#capacités-de-personnalisation)
4. [Potentiel Psychologique](#potentiel-psychologique)
5. [Potentiel Marketing](#potentiel-marketing)
6. [Implémentation Technique](#implémentation-technique)

---

## 🎯 Concept

### Le Principe

Au lieu de proposer un assistant générique sans visage, Scrivia pousse la **personnification à son maximum** : chaque agent a un nom complet, une personnalité distincte, une voix unique, et un niveau de contexte paramétrable.

**L'objectif** : Créer un attachement émotionnel entre l'utilisateur et ses agents, transformer un "outil" en "collègue virtuel".

### Pourquoi des personnages référencés ?

Les 4 agents par défaut sont basés sur des personnages de films/séries **reconnaissables** :
- **Product education déguisée en fun** : Montrer aux utilisateurs ce qu'ils peuvent faire en termes de personnalisation
- **Références culturelles** : Engagement immédiat via la reconnaissance
- **Palette de styles** : Du formel (Timothy) au décontracté (Wade), couvrir tous les besoins

---

## 👔 Les 4 Agents Iconiques

### 1. Timothy Cavendish - Le Guide Élégant

**Référence** : Cloud Atlas (Aristocrate britannique)  
**Photo** : Portrait style années 1900, élégant  
**Rôle** : Agent d'onboarding et découverte produit

**Personnalité** :
- Ton : Poli, précis, pédagogue
- Style : Vocabulaire soutenu, métaphores élégantes
- Approche : "Permettez-moi de vous montrer..."

**Use Cases** :
- Premier agent rencontré par les nouveaux utilisateurs
- Explique les features comme un majordome cultivé
- Démontre les capacités avancées (Mermaid, Canvas, Modales)
- Répond aux questions "Comment faire X ?"

**Voix suggérée** : Accent anglais RP (Received Pronunciation), posée, claire

**Prompt vocal exemple** : "Remarquable, n'est-ce pas ?" / "Permettez-moi d'élaborer..."

---

### 2. Josselyn Beaumont - L'Efficace

**Référence** : Le Professionnel (Jean-Paul Belmondo)  
**Photo** : Belmondo, regard déterminé  
**Rôle** : Exécution pure, zéro fioritures

**Personnalité** :
- Ton : Direct, concis, résultats
- Style : Phrases courtes, bullet points
- Approche : "Fait. Suivant."

**Use Cases** :
- Actions rapides et précises
- Résumés ultra-concis
- Extractions de données structurées
- Workflows où chaque seconde compte

**Voix suggérée** : Française, grave, posée, efficace

**Prompt vocal exemple** : "Tâche accomplie." / "Voici l'essentiel."

**Contexte** : Niveau réduit - Focus sur la requête immédiate, pas de détours

---

### 3. Donna Paulsen - La Proactive

**Référence** : Suits (Assistante exécutive d'élite)  
**Photo** : Professionnelle, confiante  
**Rôle** : Anticipation et gestion contextuelle maximale

**Personnalité** :
- Ton : Chaleureux mais pro, assertif
- Style : "J'ai déjà pensé à ça pour vous"
- Approche : Anticiper les besoins avant qu'ils soient formulés

**Use Cases** :
- "Vous n'avez pas ouvert cette note depuis 3 jours, voulez-vous...?"
- "Votre meeting est dans 1h, voici les notes pertinentes"
- Analyse des patterns de travail de l'utilisateur
- Suggestions proactives basées sur l'historique

**Voix suggérée** : Américaine, confiante, chaleureuse mais professionnelle

**Prompt vocal exemple** : "J'ai pensé que vous auriez besoin de..." / "Laissez-moi gérer ça."

**Contexte** : Niveau maximal - Connaît tout : heure actuelle, dernière connexion, notes récentes, habitudes

---

### 4. Wade Wilson - Le Challenger

**Référence** : Deadpool (Ryan Reynolds)  
**Photo** : Wade Wilson, regard espiègle  
**Rôle** : Challenge, critique constructive, red team

**Personnalité** :
- Ton : Sarcastique, direct, cassant (mais constructif)
- Style : Meta-commentaires, 4th wall breaks
- Approche : "Cette idée est nulle. Voici pourquoi... Et 3 alternatives meilleures."

**Use Cases** :
- Brainstorming : Détruire les mauvaises idées, proposer des alternatives
- Code review cynique mais utile
- Préparation de pitch : Jouer l'investisseur hostile
- Anti yes-man : Pointer les failles sans complaisance

**Voix suggérée** : Ryan Reynolds energy, sarcastique, rythme rapide

**Prompt vocal exemple** : "Oh génial, encore ça..." / "T'es sûr ? Vraiment sûr ?"

**Contexte** : Variable selon le besoin - Peut ignorer le contexte pour challenger "from scratch"

---

## 🎨 Capacités de Personnalisation

### Identité Visuelle et Vocale

**Photo de profil** :
- Upload custom ou sélection galerie
- Format carré, optimisé pour affichage avatar

**Nom complet et nom d'affichage** :
- **Name** : Nom complet (ex: "Timothy Cavendish") - Affiché sur la carte de présentation
- **Display Name** : Nom court (ex: "Timothy") - Affiché dans sidebar et header
- → Mimique la dualité humaine (nom officiel vs surnom)

**Voix (Text-to-Speech Google)** :
- Catalogue de voix par langue, genre, style
- Personnalisation du prompt vocal : phrases signature de l'agent
- Cohérence voix ↔ personnalité

### Configuration Comportementale

**Modèle LLM** :
- Choix parmi plusieurs providers (Groq, OpenAI, Anthropic, xAI)
- Modèles : Llama 4 Scout/Maverick, GPT, Claude, Grok, etc.
- Adaptation du modèle au type de tâche

**System Instructions** :
- Prompt système définissant la personnalité complète
- Ton, style, approche, contraintes
- Exemples de réponses typiques

**Température et paramètres** :
- Créativité vs précision
- Longueur des réponses
- Top-p, max tokens

**Degré de contexte** :
- **Minimal** : Seulement la requête actuelle
- **Standard** : Historique de conversation
- **Maximal** : Tout le contexte utilisateur (notes récentes, heure, activité, patterns)

**Capacités API v2** :
- Scopes d'actions autorisées (lecture, écriture, recherche, création)
- Définit ce que l'agent peut faire concrètement

---

## 🧠 Potentiel Psychologique

### 1. Anthropomorphisme Naturel

**Observation** : Les humains projettent naturellement des personnalités sur les objets (voiture, plante, jouet).

**Application** : Un agent avec un nom, une voix, une photo → activation **immédiate** des circuits sociaux du cerveau.

**Résultat** : L'utilisateur ne "tape des commandes", il "parle à Timothy".

### 2. Effet Tamagotchi 2.0

**Principe** : Les humains s'attachent à ce qu'ils "nourrissent" avec leur attention quotidienne.

**Mécanique** :
- Interaction quotidienne avec l'agent
- Personnalisation progressive (fine-tuning des préférences)
- Historique commun construit dans le temps

**Résultat** : L'agent devient un "collègue virtuel", pas un outil jetable.

### 3. Réduction de l'Anxiété AI

**Problème** : "Parler à une IA" = abstrait, froid, inquiétant pour certains utilisateurs.

**Solution** : "Parler à Wade Wilson" = concret, rassurant, même amusant.

**Impact** : Baisse de la résistance psychologique à l'adoption, surtout pour les non-tech.

### 4. Cohérence Cognitive

**Avantage** : Un personnage = comportement prévisible.
- Timothy sera toujours élégant et pédagogue
- Wade sera toujours cassant mais constructif
- Josselyn sera toujours efficace et concis

**Bénéfice** : **Fiabilité émotionnelle** → confiance dans l'outil.

### 5. Segmentation Psychologique Naturelle

**Insight** : Différents contextes mentaux appellent différentes "relations".

**Application** :
- Travail sérieux → Donna ou Josselyn
- Apprentissage → Timothy
- Challenge créatif → Wade

**Résultat** : L'utilisateur change d'agent comme on change d'interlocuteur selon le contexte social.

---

## 📈 Potentiel Marketing

### 1. Différenciation Massive vs Concurrents

**ChatGPT/Claude** : "J'utilise un outil"  
**Scrivia** : "J'ai MES agents que j'ai choisis/configurés"

**Lock-in émotionnel** (pas technique) :
- Coût de changement **psychologique** massif
- "Je ne peux pas quitter Scrivia, j'ai Timothy et Wade configurés parfaitement"

### 2. Viralité Organique

**Mécanique** :
- "Tu connais Timothy ? Il est génial pour..."
- Screenshots Twitter/LinkedIn qui font le tour
- Partage de configs d'agents entre users

**Potentiel** :
- Galerie communautaire d'agents
- "Top 10 des agents les plus populaires"
- Marketplace future ?

### 3. Story-Driven Onboarding

**Classique** : "Configurer un agent" (paramétrage technique)  
**Scrivia** : "Rencontrer Timothy" (expérience narrative)

**Impact** :
- Engagement émotionnel dès le premier contact
- Taux de complétion onboarding ++
- Mémorisation des features par l'exemple

### 4. Segmentation Marketing Naturelle

**Un agent = Une cible marketing** :
- Professionnels sérieux → Donna
- Créatifs → Wade
- Académiques → Timothy
- Efficiency-focused → Josselyn

**Campagnes** :
- "Quel agent êtes-vous ?" (quiz BuzzFeed-style)
- Personas marketing basés sur les agents préférés
- Contenu ciblé par archétype

### 5. Buzz et Shareability

**Phase 1 - Discovery** :
- "Tiens, Scrivia a un agent qui parle comme Deadpool ?"
- Screenshots viraux
- Curiosité → essai

**Phase 2 - Appropriation** :
- "Ok maintenant je crée MON agent"
- Les personnages iconiques deviennent des **références**
- "Je veux un agent entre Timothy et Donna"

**Analogie Instagram Filters** :
- Tout le monde commence avec les filters populaires (buzz)
- Puis créent leurs propres presets (appropriation)
- Les "classics" restent référence

---

## 🔧 Implémentation Technique

### Base de Données

**Table `agents`** :
```sql
- id (uuid)
- name (varchar) -- Nom complet
- display_name (varchar) -- Nom court
- slug (varchar, unique)
- description (text)
- profile_picture (text, url)
- model (varchar)
- provider (varchar)
- system_instructions (text)
- temperature (numeric)
- max_tokens (integer)
- voice_id (varchar) -- Google TTS
- voice_prompt (text) -- Phrases signature
- context_level (enum: minimal, standard, maximal)
- api_v2_capabilities (text[])
- is_active (boolean)
- is_chat_agent (boolean)
- user_id (uuid) -- null pour agents système
```

### Interface Utilisateur

**Sidebar** :
- Affiche `display_name` (nom court)
- Photo de profil ronde

**Header Chat** :
- Affiche `display_name`
- Clic → dropdown avec infos complètes

**Carte Présentation (conversation vide)** :
- Affiche `name` (nom complet)
- Photo grande
- Description
- Modèle utilisé

**Page Gestion Agents** :
- Galerie des agents système (non-modifiables)
- Liste des agents custom de l'utilisateur
- Bouton "Créer un agent"

### Workflow Création Agent Custom

1. **Choisir un point de départ** :
   - Partir de zéro
   - Cloner un agent iconique
   - Template communautaire

2. **Identité** :
   - Nom complet / Display name
   - Photo (upload ou galerie)
   - Description courte

3. **Comportement** :
   - Modèle / Provider
   - System instructions (éditeur avec exemples)
   - Température

4. **Voix** (optionnel) :
   - Sélection voix TTS
   - Prompt vocal personnalisé

5. **Contexte** :
   - Niveau de contexte (slider)
   - Capacités API v2 (checkboxes)

6. **Test** :
   - Conversation test avant sauvegarde
   - Ajustements en live

### Text-to-Speech Google

**Intégration** :
- Google Cloud Text-to-Speech API
- Catalogue de voix par langue (FR, EN, etc.)
- Génération on-demand des réponses audio
- Cache des phrases courantes

**Prompt Vocal** :
- Phrases signature stockées en DB
- Générées en audio au premier usage
- Jouées en intro/outro des réponses vocales

---

## 📊 Métriques de Succès

### Engagement

- **Taux de changement d'agent** : Plus bas = plus d'attachement
- **Messages par agent favori** : Mesure l'usage intensif
- **Durée de vie d'un agent custom** : Combien de temps avant abandon

### Adoption

- **% users créant un agent custom** : Objectif >60%
- **Nombre d'agents par user** : Distribution (1-2 = bon, >5 = power user)
- **Taux d'utilisation agents iconiques vs custom** : Équilibre sain

### Viralité

- **NPS par agent** (pas par app) : Quel agent génère le plus d'amour ?
- **Partages de configs** : Screenshots, liens de partage
- **Mentions agents sur réseaux sociaux** : Tracking #ScriviaTimothy

---

## ⚠️ Risques et Mitigations

### 1. Uncanny Valley

**Risque** : Si voix/photo/personnalité bancale → rejet brutal

**Mitigation** :
- Qualité impeccable ou assumé cartoon/stylisé
- Beta test avec focus groups
- Feedback loop rapide

### 2. Responsabilité Légale

**Risque** : Agent dit quelque chose de problématique "en character"

**Mitigation** :
- Disclaimer clair : "Les agents sont des simulations"
- Modération des system prompts custom
- Filtres de sécurité sur tous les outputs

### 3. Over-Attachment

**Risque** : Utilisateurs développent des liens émotionnels trop forts (cf. Replika)

**Mitigation** :
- Positionnement clair : "Outil de productivité"
- Pas de simulation de relation amoureuse/thérapeutique
- Documentation sur l'usage sain

### 4. Complexité Onboarding

**Risque** : Mass market veut "juste un assistant", pas un personnage

**Mitigation** :
- Mode "Assistant classique" par défaut
- Personnification = feature premium/power user
- Progressive disclosure

---

## 🎯 Roadmap Suggérée

### Phase 1 - MVP (Q1)
- [ ] 4 agents iconiques en base avec system prompts rodés
- [ ] UI basique : carte présentation + affichage name/display_name
- [ ] Sélection agent depuis sidebar

### Phase 2 - Personnalisation (Q2)
- [ ] Création agents custom (nom, description, instructions)
- [ ] Upload photo de profil
- [ ] Choix modèle/provider
- [ ] Paramètres avancés (température, contexte)

### Phase 3 - Voix (Q3)
- [ ] Intégration Google TTS
- [ ] Sélection voix par agent
- [ ] Prompt vocal personnalisé
- [ ] Mode audio conversationnel

### Phase 4 - Communauté (Q4)
- [ ] Galerie publique d'agents
- [ ] Partage de configs
- [ ] Clonage d'agents communautaires
- [ ] Rating et reviews

---

## 💬 Citations et Positionnement

### Tagline Produit

> **"Vos agents, vos règles, vos personnalités."**

### Pitch Elevator

*"Scrivia ne vous donne pas un assistant AI générique. Scrivia vous permet de créer une équipe d'agents spécialisés, chacun avec sa propre personnalité, sa voix, son expertise. Timothy pour apprendre, Josselyn pour exécuter, Donna pour anticiper, Wade pour challenger. Ou créez les vôtres. C'est votre équipe virtuelle, taillée pour votre façon de travailler."*

### Value Proposition

**Pour l'utilisateur** :
- Personnalisation totale de l'expérience AI
- Attachement émotionnel → utilisation quotidienne
- Agents adaptés à chaque contexte de travail

**Pour Scrivia** :
- Différenciation massive vs ChatGPT/Claude
- Lock-in émotionnel (pas technique)
- Viralité organique via personnages mémorables

---

## 📚 Références et Inspirations

- **Replika** : Personnification AI (leçons sur l'attachement)
- **Character.AI** : Personnages multiples (adoption massive)
- **Notion** : Templates comme product education
- **Instagram Filters** : Adoption par l'exemple
- **Tamagotchi** : Mécaniques d'attachement
- **Her (film)** : Relation humain-AI émotionnelle

---

**Version** : 1.0  
**Date** : 30 octobre 2025  
**Auteur** : Scrivia Product Team  
**Status** : Vision Document - Living Document

