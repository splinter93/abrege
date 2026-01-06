# 🎯 STRATÉGIE PRICING IA - SCRIVIA 2025

**Date :** 30 janvier 2025  
**Version :** 1.0  
**Statut :** Document stratégique de référence

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Features IA du Chat](#features-ia-du-chat)
3. [Modèles LLM Disponibles](#modèles-llm-disponibles)
4. [Pricing des Modèles](#pricing-des-modèles)
5. [Modèle Économique](#modèle-économique)
6. [Plans d'Abonnement](#plans-dabonnement)
7. [Recommandations Stratégiques](#recommandations-stratégiques)

---

## 🎯 VUE D'ENSEMBLE

### Positionnement

**Scrivia = Cursor pour vos notes**

> "Cursor révolutionne l'écriture de code.  
> **Scrivia révolutionne l'écriture de contenu.**"

**Vision :** Chat intelligent qui travaille avec vos notes en temps réel, avec workflow bidirectionnel unique (écrire → agent voit, brainstormer → agent écrit).

### Différenciation Technique

1. **Workflow bidirectionnel** : Chat ↔ Éditeur (Canva Pane) en temps réel
2. **Tool calls fluides** : Multi-rounds, orchestration robuste
3. **Mentions @note** : Contexte injecté intelligemment
4. **Streaming fluide** : Token par token vers éditeur
5. **Agents spécialisés** : Personnalisables avec configuration LLM complète

---

## 🤖 FEATURES IA DU CHAT

### 1. Système de Chat Complet

#### Interface
- ✅ Chat fullscreen (plein écran)
- ✅ Chat sidebar (intégré)
- ✅ Modes de largeur (750px / 1000px)
- ✅ Design glassmorphism moderne
- ✅ Streaming temps réel (token par token)

#### Fonctionnalités Core
- ✅ **Multimodal** : Texte + images en entrée
- ✅ **Streaming** : Réponses progressives en temps réel
- ✅ **Reasoning** : Affichage du processus de pensée (modèles reasoning)
- ✅ **Tool Calls** : Exécution d'outils pour actions automatisées
- ✅ **Retry** : Relance automatique en cas d'erreur
- ✅ **Édition messages** : Édition ChatGPT-style avec régénération
- ✅ **Régénération** : Regénérer la dernière réponse

#### Fonctionnalités Avancées
- ✅ **Slash Commands** : Accès rapide aux prompts via "/"
- ✅ **Mentions @note** : Mention de notes avec menu déroulant
- ✅ **Whisper Turbo** : Reconnaissance vocale intégrée ($0.04/heure)
- ✅ **Mermaid** : Rendu de diagrammes dans les réponses
- ✅ **Canva Pane** : Éditeur TipTap intégré dans le chat
- ✅ **Infinite Scroll** : Chargement progressif des messages
- ✅ **Gestion erreurs** : Affichage et retry des erreurs

### 2. Agents IA Spécialisés

#### Création et Configuration
- ✅ Création d'agents personnalisés
- ✅ Configuration LLM complète (modèle, température, max_tokens, top_p, reasoning_effort)
- ✅ Instructions système personnalisables
- ✅ Support MCP (Model Context Protocol)
- ✅ Support OpenAPI (tools configurables)

#### Capacités
- ✅ **Accès API Scrivia** : Créer, modifier, rechercher notes
- ✅ **Multi-tool orchestration** : Utilisation séquentielle de plusieurs outils
- ✅ **Agents as Tools** : Un agent peut appeler un autre agent
- ✅ **Function calling** : Appel de fonctions automatique

### 3. Workflow Bidirectionnel Unique

#### Chat → Éditeur
- ✅ Streaming SSE : Chat → Canva Pane (mot par mot)
- ✅ Auto-save : Sauvegarde toutes les 2s après stream
- ✅ Realtime : Synchronisation multi-onglets

#### Éditeur → Chat
- ✅ Mentions @note : Contexte injecté automatiquement
- ✅ Notes épinglées : Contenu complet dans contexte
- ✅ Mentions légères : Métadonnées uniquement (~30-40 tokens)

---

## 💰 MODÈLES LLM DISPONIBLES

### Comparaison des 3 Modèles Qualitatifs

| Modèle | Input | Output | Cache | Qualité | Notes |
|--------|-------|--------|-------|---------|-------|
| **Grok 4 Fast** | $0.20/1M | $0.50/1M | $0.05/1M | Excellente | Reasoning + Non-reasoning |
| **DeepSeek** | $0.28/1M | $0.42/1M | $0.028/1M | Excellente | Reasoning + Non-reasoning |
| **Xiaomi Mimo V2 Flash** | $0.10/1M | $0.30/1M | ~$0.05/1M | **Légèrement supérieure** | **Meilleure qualité** |

### Recommandation : Xiaomi Mimo V2 Flash

**Avantages :**
- ✅ **50% moins cher input** que Grok
- ✅ **40% moins cher output** que Grok
- ✅ **Qualité légèrement supérieure** aux deux autres
- ✅ **Cache automatique** (géré par l'API)

**Stratégie :**
- Xiaomi Mimo V2 Flash par défaut (90% des cas)
- Grok 4 Fast en fallback (5% des cas)
- DeepSeek Reasoner pour cas très complexes (5% des cas)

---

## 💵 PRICING DES MODÈLES

### LLM (Xiaomi Mimo V2 Flash)

| Type | Prix | Notes |
|------|------|-------|
| **Input normal** | $0.10/1M | Tokens non cachés |
| **Input cache** | $0.05/1M | Tokens en cache (50% moins cher) |
| **Output** | $0.30/1M | Pas de cache |

**Cache hit rate estimé :** 58-65% (réaliste pour utilisateur actif)

### Embeddings (OpenAI)

| Modèle | Prix normal | Prix batch | Recommandation |
|--------|-------------|------------|----------------|
| **text-embedding-3-small** | $0.02/1M | $0.01/1M | ✅ Recommandé (batch) |
| **text-embedding-3-large** | $0.13/1M | $0.065/1M | Si qualité supérieure nécessaire |

**Stratégie :** Utiliser batch processing (50% économie)

### Whisper Turbo (Transcription Vocale)

| Service | Prix | Notes |
|---------|------|-------|
| **Whisper Turbo** | $0.04/heure | Transcription audio, rapide et précis |

**Usage estimé :** 1.5 heures/mois pour utilisateur actif = $0.06/mois

---

## 📊 MODÈLE ÉCONOMIQUE

### Plan Pro (20€/mois) - Coûts Réels

**Quotas :**
- 20M tokens input/mois
- 4M tokens output/mois
- 5000 embeddings/mois
- 2000 RAG queries/mois
- 1.5 heures Whisper/mois

**Coûts détaillés (Xiaomi Mimo V2 Flash, cache 58%) :**

```
LLM Input (cache) : 11.6M × $0.05 = $0.58 (18%)
LLM Input (non-cache) : 8.4M × $0.10 = $0.84 (26%)
LLM Output : 4M × $0.30 = $1.20 (37%)
Embeddings (batch) : 5000 × 500 × $0.01 = $0.025 (1%)
RAG queries : 2000 × 100 × $0.02 = $0.004 (<1%)
Whisper Turbo : 1.5 × $0.04 = $0.06 (2%)
Infrastructure : $0.50 (16%)
─────────────────────────────────────────
Total : $3.21 USD
```

**Marge : 84%** ($20 - $3.21 = $16.79)

### Répartition des Coûts

- **LLM** : 82% des coûts (input + output)
- **Output** : 37% des coûts (le plus important)
- **Infrastructure** : 16% des coûts
- **Whisper** : 2% des coûts (négligeable)
- **Embeddings** : 1% des coûts (négligeable)

---

## 💳 PLANS D'ABONNEMENT

### Plan Free (0€)

**Quotas :**
- 1M tokens LLM input/mois
- 200K tokens LLM output/mois
- 100 embeddings/mois
- 50 RAG queries/mois
- 0.5 heures Whisper/mois
- Historique : 5 messages
- Tool calls : 3 max
- Pas de RAG
- Pas de Memory

**Coûts :**
```
LLM : 500K × $0.05 + 500K × $0.10 + 200K × $0.30 = $0.14
Embeddings : $0.0005
Whisper : 0.5 × $0.04 = $0.02
Total : $0.16 USD
```

**Marge :** Négative (acquisition)

---

### Plan Basic (9€/mois)

**Quotas :**
- 5M tokens LLM input/mois
- 1M tokens LLM output/mois
- 1000 embeddings/mois
- 500 RAG queries/mois
- 1 heure Whisper/mois
- Historique : 10 messages
- Tool calls : 10 max
- RAG : 500 queries/mois
- Memory : 1000 entries

**Coûts (cache 55%) :**
```
LLM : 2.75M × $0.05 + 2.25M × $0.10 + 1M × $0.30 = $0.66
Embeddings : $0.005
Whisper : 1 × $0.04 = $0.04
Infrastructure : $0.50
Total : $1.21 USD
```

**Marge : 87%** ($9 - $1.21 = $7.79)

---

### Plan Pro (20€/mois) ← TARGET

**Quotas :**
- 20M tokens LLM input/mois
- 4M tokens LLM output/mois
- 5000 embeddings/mois
- 2000 RAG queries/mois
- 1.5 heures Whisper/mois
- Historique : 20 messages
- Tool calls : 20 max
- RAG : 2000 queries/mois
- Memory : 5000 entries
- Streaming vers Canva
- Agents personnalisables

**Coûts (cache 58%) :**
```
LLM : 11.6M × $0.05 + 8.4M × $0.10 + 4M × $0.30 = $2.62
Embeddings : $0.03
Whisper : $0.06
Infrastructure : $0.50
Total : $3.21 USD
```

**Marge : 84%** ($20 - $3.21 = $16.79)

---

### Plan Enterprise (49€/mois)

**Quotas :**
- 70M tokens LLM input/mois
- 14M tokens LLM output/mois
- 20000 embeddings/mois
- 10000 RAG queries/mois
- 5 heures Whisper/mois
- Historique : 50 messages
- Tool calls : illimité
- RAG : illimité
- Memory : illimité
- Multi-canvas
- Support prioritaire

**Coûts (cache 60%) :**
```
LLM : 42M × $0.05 + 28M × $0.10 + 14M × $0.30 = $9.10
Embeddings : $0.10
Whisper : $0.20
Infrastructure : $1.00
Total : $10.40 USD
```

**Marge : 79%** ($49 - $10.40 = $38.60)

---

## 🎯 RECOMMANDATIONS STRATÉGIQUES

### Court Terme (Immédiat)

#### 1. Modèle par Défaut
- ✅ **Xiaomi Mimo V2 Flash** par défaut (90% des cas)
- ✅ **Grok 4 Fast** en fallback (5% des cas)
- ✅ **DeepSeek Reasoner** pour cas très complexes (5% des cas)

#### 2. Optimisations Critiques
- ✅ **Limiter historique** : 10-20 messages max (au lieu de 50-100)
- ✅ **Cache embeddings** : Hash → embedding (70% économie)
- ✅ **Batch processing** : Embeddings par lots (50% économie)
- ✅ **Mentions légères** : Métadonnées uniquement (95% économie)

#### 3. Monitoring
- ✅ Dashboard coûts temps réel
- ✅ Alertes si dépassement quotas
- ✅ Cache hit rate tracking

---

### Moyen Terme (1-3 mois)

#### 1. Modèle Adaptatif Intelligent
- Détecter ratio input/output
- Router vers meilleur modèle automatiquement
- Économie : 5-10%

#### 2. Optimisation Cache
- Target : 70%+ cache hit rate
- System prompts stables
- Historique récent prioritaire
- Économie : ~$0.30/mois

#### 3. Quotas Dynamiques
- Ajuster selon usage réel
- Augmenter si cache > 70%
- Optimiser automatiquement

---

### Long Terme (3-6 mois)

#### 1. RAG Self-Hosted (Optionnel)
- Qdrant (vector DB gratuit)
- Embeddings locaux (Ollama)
- Économie : ~$0.03/mois (négligeable mais bon à avoir)

#### 2. Modèles Locaux (Optionnel)
- Ollama pour certains cas
- Économie : variable selon usage

#### 3. Compression Contexte
- Techniques avancées
- Summary si historique long
- Économie : 20-30%

---

## 📈 COMPARAISON DES STRATÉGIES

### Stratégie 1 : Xiaomi Mimo V2 Flash (Recommandé)

**Avantages :**
- ✅ 32% moins cher que Grok
- ✅ Qualité légèrement supérieure
- ✅ Meilleure marge (84% vs 81%)
- ✅ Quotas augmentés possibles

**Coût :** $3.21/mois  
**Marge :** 84%

---

### Stratégie 2 : Grok 4 Fast

**Avantages :**
- ✅ Cache automatique efficace
- ✅ Reasoning avancé
- ✅ Qualité excellente

**Coût :** $3.79/mois  
**Marge :** 81%

---

### Stratégie 3 : DeepSeek

**Avantages :**
- ✅ Output moins cher ($0.42 vs $0.50)
- ✅ Reasoning très avancé
- ✅ Qualité excellente

**Coût :** $3.95/mois  
**Marge :** 80%

---

## 🎯 VERDICT FINAL

### Oui, le Pricing 20€/mois est Largement Viable

**Avec Xiaomi Mimo V2 Flash :**
- ✅ Coût total : $3.21/mois
- ✅ Marge : 84% (excellente)
- ✅ Qualité : Légèrement supérieure aux autres
- ✅ Quotas : 20M input / 4M output (généreux)

**Points Clés :**
- LLM = 82% des coûts (input + output)
- Output = 37% des coûts (le plus important)
- Whisper = 2% (négligeable)
- Embeddings = 1% (négligeable)

**Recommandation :**
1. **Xiaomi Mimo V2 Flash** par défaut
2. **Grok 4 Fast** en fallback
3. **DeepSeek Reasoner** pour cas très complexes
4. **Quotas** : 20M input / 4M output / 1.5h Whisper

---

## 📝 NOTES FINALES

### Optimisations Futures

1. **Cache hit rate** : Target 70%+ (actuellement 58%)
2. **Modèle adaptatif** : Router automatiquement selon ratio
3. **Quotas dynamiques** : Ajuster selon usage réel
4. **Monitoring avancé** : Dashboard temps réel + alertes

### Risques Identifiés

1. **Cache hit rate < 50%** : Coûts augmentent de ~30%
2. **Output très lourd** : Ratio < 3:1 → DeepSeek plus économique
3. **Modèle indisponible** : Fallback nécessaire (Grok/DeepSeek)

### Opportunités

1. **Quotas augmentés** : Avec marge 84%, possibilité d'augmenter quotas
2. **Pricing premium** : Marge élevée permet pricing compétitif
3. **Features premium** : Multi-canvas, agents illimités, etc.

---

**Document créé le :** 30 janvier 2025  
**Dernière mise à jour :** 30 janvier 2025  
**Version :** 1.0



