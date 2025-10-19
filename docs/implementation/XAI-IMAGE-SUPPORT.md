# 🖼️ xAI Grok - Support des Images

## 📋 Vue d'ensemble

**xAI Grok supporte nativement les images** ! C'est un **avantage majeur** sur Groq qui ne supporte pas les images.

### ✅ Avantages

- 🎨 **Support natif** : jpg/jpeg/png, max 20 Mo
- 🔗 **Via URL ou base64** : Flexibilité maximale
- ⚙️ **Contrôle de qualité** : `low` / `auto` / `high`
- 🚀 **Compatible OpenAI** : Format standard
- 🔧 **Avec tool calls** : Combinez images + function calling

---

## 🎯 Cas d'usage

1. **OCR** - Extraction de texte depuis images/documents
2. **Analyse UI/UX** - Screenshots d'interfaces
3. **Diagrammes techniques** - Architecture, schémas
4. **Factures/Documents** - Traitement comptable
5. **Vision générale** - Description, analyse d'images

---

## 💻 Utilisation

### Méthode simple (recommandée)

```typescript
import { XAIProvider } from '@/services/llm/providers';

const xai = new XAIProvider();

const response = await xai.callWithImages(
  'Décris cette image en détail.',
  [
    {
      url: 'https://example.com/image.jpg',
      detail: 'high' // 'auto' | 'low' | 'high'
    }
  ],
  {
    systemMessage: 'Tu es un expert en analyse d\'images.',
    temperature: 0.7,
    maxTokens: 2000
  }
);

console.log(response.content);
```

### Avec plusieurs images

```typescript
const response = await xai.callWithImages(
  'Compare ces deux images.',
  [
    { url: 'https://example.com/img1.jpg', detail: 'high' },
    { url: 'https://example.com/img2.jpg', detail: 'high' }
  ]
);
```

### Avec image locale (base64)

```typescript
import * as fs from 'fs';

// Charger l'image
const imageBuffer = fs.readFileSync('./image.jpg');
const base64Image = XAIProvider.encodeImageToBase64(imageBuffer, 'image/jpeg');

const response = await xai.callWithImages(
  'Analyse cette image.',
  [{ url: base64Image, detail: 'auto' }]
);
```

### Avec function calling

```typescript
const tools = [
  {
    type: 'function',
    function: {
      name: 'save_analysis',
      description: 'Sauvegarder l\'analyse d\'une image',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          analysis: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } }
        },
        required: ['title', 'analysis']
      }
    }
  }
];

const response = await xai.callWithImages(
  'Analyse cette image et sauvegarde ton analyse.',
  [{ url: 'https://example.com/img.jpg', detail: 'high' }],
  { systemMessage: 'Tu es un assistant d\'analyse.' },
  [], // history
  tools
);

console.log('Tool calls:', response.tool_calls);
```

---

## 🔧 Helpers statiques

### Créer un message avec images

```typescript
const message = XAIProvider.createMessageWithImages(
  'Décris ces images.',
  [
    'https://example.com/img1.jpg',
    'https://example.com/img2.jpg'
  ],
  'auto' // detail level
);

// Utiliser dans callWithMessages
const response = await xai.callWithMessages([message], []);
```

### Encoder une image en base64

```typescript
import * as fs from 'fs';

const buffer = fs.readFileSync('./image.png');
const base64 = XAIProvider.encodeImageToBase64(buffer, 'image/png');

// Utiliser directement
const response = await xai.callWithImages(
  'Analyse cette image.',
  [{ url: base64 }]
);
```

---

## ⚙️ Paramètre `detail`

Contrôle la résolution de traitement de l'image :

| Valeur | Résolution | Vitesse | Coût | Usage |
|--------|------------|---------|------|-------|
| `low` | Basse | ⚡ Rapide | 💰 Moins cher | Aperçu rapide |
| `auto` | Automatique | ⚖️ Équilibré | ⚖️ Moyen | Par défaut |
| `high` | Haute | 🐌 Plus lent | 💰💰 Plus cher | Détails fins |

### Recommandations

- **OCR / Texte** → `high` (précision maximale)
- **Analyse générale** → `auto` (bon compromis)
- **Aperçu rapide** → `low` (économique)

---

## 📊 Formats supportés

| Format | Extension | Max size | Notes |
|--------|-----------|----------|-------|
| JPEG | `.jpg`, `.jpeg` | 20 Mo | Recommandé pour photos |
| PNG | `.png` | 20 Mo | Recommandé pour screenshots |

**Non supportés** : gif, webp, svg, bmp

---

## 💡 Exemples pratiques

### OCR - Extraction de texte

```typescript
const response = await xai.callWithImages(
  'Extrait tout le texte de cette image. Formate en markdown.',
  [{ url: 'https://example.com/document.jpg', detail: 'high' }],
  {
    systemMessage: 'Tu es un expert OCR.',
    temperature: 0.3 // Basse température = plus de précision
  }
);
```

### Analyse UI/UX

```typescript
const response = await xai.callWithImages(
  `Analyse cette interface:
  1. Points forts du design
  2. Problèmes UX identifiés
  3. 3 suggestions d'amélioration`,
  [{ url: 'https://example.com/ui-screenshot.png', detail: 'high' }],
  {
    systemMessage: 'Tu es un expert UX/UI designer.',
    temperature: 0.7
  }
);
```

### Analyse de diagramme technique

```typescript
const xai = new XAIProvider({
  model: 'grok-4-fast-reasoning' // ← Mode reasoning pour analyse technique
});

const response = await xai.callWithImages(
  'Explique ce diagramme d\'architecture. Identifie les composants et les flux.',
  [{ url: 'https://example.com/diagram.png', detail: 'high' }],
  {
    systemMessage: 'Tu es un architecte logiciel senior.'
  }
);

console.log('Reasoning:', response.reasoning);
console.log('Explication:', response.content);
```

### Traitement de factures

```typescript
const tools = [
  {
    type: 'function',
    function: {
      name: 'save_invoice',
      description: 'Sauvegarder les données d\'une facture',
      parameters: {
        type: 'object',
        properties: {
          company_name: { type: 'string' },
          invoice_number: { type: 'string' },
          total_amount: { type: 'number' },
          date: { type: 'string' }
        },
        required: ['company_name', 'invoice_number', 'total_amount']
      }
    }
  }
];

const response = await xai.callWithImages(
  'Extrais les informations de cette facture et sauvegarde-les.',
  [{ url: 'https://example.com/invoice.jpg', detail: 'high' }],
  {
    systemMessage: 'Tu es un expert en traitement de documents comptables.',
    temperature: 0.3
  },
  [],
  tools
);
```

---

## 🔍 Format avancé (manuel)

Si vous préférez construire manuellement les messages :

```typescript
const messages = [
  {
    role: 'system',
    content: 'Tu es un assistant d\'analyse d\'images.'
  },
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Décris cette image.'
      },
      {
        type: 'image_url',
        image_url: {
          url: 'https://example.com/image.jpg',
          detail: 'high'
        }
      }
    ]
  }
];

const response = await xai.callWithMessages(messages, []);
```

---

## ⚡ Performances

### Tests de latence

```typescript
// Low detail = Plus rapide
const start = Date.now();
await xai.callWithImages('Décris.', [{ url: '...', detail: 'low' }]);
console.log(`Low: ${Date.now() - start}ms`);

// High detail = Plus lent mais plus précis
const start2 = Date.now();
await xai.callWithImages('Décris.', [{ url: '...', detail: 'high' }]);
console.log(`High: ${Date.now() - start2}ms`);
```

**Résultats typiques** :
- `low` : ~1-2s
- `auto` : ~2-3s
- `high` : ~3-5s

---

## 💰 Coûts

Les images consomment des tokens supplémentaires :

- **Low detail** : ~85 tokens par image
- **Auto detail** : ~170-765 tokens (selon taille)
- **High detail** : ~765-2040 tokens (selon taille)

**Calcul de coût** :
```
Tokens image = resolution-dependent
Tokens texte = basé sur le texte
Total = (tokens_image + tokens_texte) × prix_par_token
```

**Exemple** :
```
Image high detail : ~1000 tokens
Texte prompt : ~50 tokens
Réponse : ~200 tokens

Total input : 1050 tokens × $0.20/1M = $0.00021
Total output : 200 tokens × $0.50/1M = $0.0001

Coût total : ~$0.00031 par image analysée
```

---

## 🛠️ Intégration dans l'application

### Dans le chat

```typescript
// Frontend envoie les images
const formData = new FormData();
formData.append('message', 'Analyse ces images');
formData.append('images', imageFile1);
formData.append('images', imageFile2);

// Backend traite
const imageUrls = await uploadToS3(images); // Uploader d'abord
const response = await xai.callWithImages(message, imageUrls);
```

### Dans un agent spécialisé

```typescript
// Créer un agent "Vision Expert"
const agent = {
  display_name: 'Vision Expert',
  slug: 'vision-expert',
  model: 'grok-4-fast',
  provider: 'xai',
  system_instructions: 'Tu es un expert en analyse d\'images...',
  capabilities: ['images', 'function_calling']
};
```

---

## 📚 Documentation complète

- **Exemples** : `examples/xai-grok-images-usage.ts`
- **Doc officielle** : https://docs.x.ai/docs/guides/image-understanding

---

## ✅ Checklist d'implémentation

- [x] Support images dans XAIProvider
- [x] Méthode `callWithImages()`
- [x] Helper `createMessageWithImages()`
- [x] Helper `encodeImageToBase64()`
- [x] Support multi-images
- [x] Support detail levels
- [x] Support function calling + images
- [x] 10 exemples pratiques
- [x] Documentation complète
- [x] TypeScript strict (zéro erreur)

---

## 🎉 Conclusion

**Le support des images est 100% opérationnel !**

xAI Grok est maintenant **le seul provider de l'application à supporter les images**, ce qui ouvre de nouveaux cas d'usage :

- ✅ OCR et extraction de données
- ✅ Analyse UI/UX de screenshots
- ✅ Traitement de documents visuels
- ✅ Vision + function calling combinés
- ✅ Analyse technique de diagrammes

**Avantage compétitif majeur sur Groq !** 🚀

