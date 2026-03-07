# Guide des Speech Tags TTS — xAI

Document de référence pour les agents qui génèrent du texte destiné à la synthèse vocale (TTS). Les speech tags permettent de contrôler le rythme, le ton et l’expressivité de la lecture.

---

## 1. Wrapping tags (englobants)

Ces tags entourent un passage de texte pour modifier sa façon d’être lu. **Ouvre avec `<tag>` et ferme avec `</tag>`.**

### Volume et intensité

| Tag | Usage | Exemple |
|-----|-------|---------|
| `<soft>` | Parler plus doucement | `<soft>Chut, c'est un secret.</soft>` |
| `<whisper>` | Chuchoter | `<whisper>Ne le dis à personne.</whisper>` |
| `<loud>` | Parler plus fort | `<loud>Attention !</loud>` |
| `<build-intensity>` | Monter en intensité | `<build-intensity>Et voilà le résultat !</build-intensity>` |
| `<decrease-intensity>` | Baisser en intensité | `<decrease-intensity>Bon, c'est fini.</decrease-intensity>` |

### Pitch et vitesse

| Tag | Usage | Exemple |
|-----|-------|---------|
| `<slow>` | Ralentir | `<slow>Écoute bien.</slow>` |
| `<fast>` | Accélérer | `<fast>En résumé : tout est prêt.</fast>` |
| `<higher-pitch>` | Monter la voix | `<higher-pitch>Oh vraiment ?</higher-pitch>` |
| `<lower-pitch>` | Descendre la voix | `<lower-pitch>C'est sérieux.</lower-pitch>` |

### Style vocal

| Tag | Usage | Exemple |
|-----|-------|---------|
| `<emphasis>` | Mettre en emphase | `<emphasis>C'est exactement ça.</emphasis>` |
| `<sing-song>` | Ton chantant, léger | `<sing-song>Et hop, c'est fait !</sing-song>` |
| `<singing>` | Chanter | `<singing>La la la...</singing>` |
| `<laugh-speak>` | Parler en riant | `<laugh-speak>C'est trop drôle !</laugh-speak>` |

---

## 2. Inline tags (ponctuation vocale)

Ces tags se placent **à un point précis** du texte pour ajouter une expression ou une pause.

### Pauses

| Tag | Usage |
|-----|-------|
| `[pause]` | Courte pause |
| `[long-pause]` | Pause plus longue |
| `[hum-tune]` | Petit bourdonnement / réflexion |

### Rires et émotions

| Tag | Usage |
|-----|-------|
| `[laugh]` | Rire |
| `[chuckle]` | Petit rire |
| `[giggle]` | Gloussement |
| `[cry]` | Pleurer |

### Sons de bouche

| Tag | Usage |
|-----|-------|
| `[tsk]` | Tsk (désapprobation) |
| `[tongue-click]` | Claquement de langue |
| `[lip-smack]` | Claquement de lèvres |

### Respiration

| Tag | Usage |
|-----|-------|
| `[breath]` | Respiration |
| `[inhale]` | Inspiration |
| `[exhale]` | Expiration |
| `[sigh]` | Soupir |

---

## 3. Règles d’utilisation

### Combiner tags et ponctuation

- Mieux : `"Vraiment ? [laugh] C'est incroyable !"`
- Moins bien : empiler les tags sans ponctuation.

### Placer les inline tags

- Mettre les tags **là où l’expression se produit** dans la phrase.
- Exemple : `"Je suis entré et [pause] là, c'était le chaos."`

### Utiliser les pauses

- `[pause]` : pour une courte hésitation ou un effet de suspense.
- `[long-pause]` : pour laisser une idée résonner.

### Wrapping tags sur des phrases complètes

- Mieux : `<whisper>C'est un secret.</whisper>`
- Moins bien : envelopper un seul mot.

### Combiner plusieurs styles

- Exemple : `<slow><soft>Bonne nuit, dors bien.</soft></slow>`
- Fermer les tags dans l’ordre inverse : `<slow><soft>texte</soft></slow>`.

---

## 4. Exemples complets

### Explication avec emphase

```
Voici la solution : <emphasis>il suffit de cliquer ici.</emphasis> [pause] C'est tout.
```

### Confidence / secret

```
Je vais te dire quelque chose. <whisper>Personne ne le sait encore.</whisper> [pause] Tu es le premier.
```

### Annonce enthousiaste

```
<build-intensity>Et le gagnant est...</build-intensity> [long-pause] Jean Dupont !
```

### Réflexion

```
Hmm, [pause] laisse-moi réfléchir. [hum-tune] En fait, je pense que oui.
```

### Désapprobation légère

```
[tsk] Non, ce n'est pas comme ça qu'on fait. [pause] Regarde.
```

### Conclusion douce

```
<decrease-intensity>Voilà, c'est terminé.</decrease-intensity> [sigh] À la prochaine.
```

---

## 5. À éviter

- Ne pas abuser des tags : garder une lecture naturelle.
- Ne pas imbriquer trop de wrapping tags (max 2–3 niveaux).
- Ne pas oublier de fermer les wrapping tags : `<tag>texte</tag>`.
- Ne pas utiliser de tags dans du contenu technique pur (code, commandes).

---

## 6. Limite technique

Le texte envoyé au TTS est limité à **4 096 caractères**. Pour des contenus longs, découper par paragraphes ou par blocs logiques.

---

*Référence : [xAI TTS Speech Tags](https://docs.x.ai/model-capabilities/audio/voice)*
