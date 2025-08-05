# Intégration Together AI - GPT-OSS-120B

## Vue d'ensemble

L'intégration de Together AI avec le modèle GPT-OSS-120B a été ajoutée au système Abrège. Ce provider utilise l'API Together pour accéder au modèle open-source GPT-OSS-120B d'OpenAI.

## Configuration

### Variables d'environnement

Ajoutez la variable d'environnement suivante à votre fichier `.env` :

```bash
TOGETHER_API_KEY=votre_clé_api_together
```

### Obtention d'une clé API

1. Créez un compte sur [Together AI](https://www.together.ai)
2. Générez une clé API dans votre dashboard
3. Ajoutez la clé à vos variables d'environnement

## Caractéristiques du modèle

- **Modèle** : `openai/gpt-oss-120b`
- **Architecture** : Mixture-of-Experts (MoE) avec 120B paramètres
- **Contexte** : 128K tokens
- **Capacités** : Chain-of-thought reasoning, multimodale
- **Prix** : $0.15 input / $0.60 output par 1M tokens

## Configuration par défaut

```typescript
{
  model: 'openai/gpt-oss-120b',
  temperature: 0.7,
  max_tokens: 4000,
  top_p: 0.9,
  system_instructions: 'Tu es un assistant IA utile et bienveillant.',
  context_template: '## Contexte utilisateur\n- Type: {{type}}\n- Nom: {{name}}\n- ID: {{id}}\n{{#if content}}- Contenu: {{content}}{{/if}}',
  api_config: {
    baseUrl: 'https://api.together.xyz/v1',
    endpoint: '/chat/completions'
  }
}
```

## Utilisation

Le provider est automatiquement enregistré dans le `LLMProviderManager` et peut être utilisé comme les autres providers :

```typescript
import { LLMProviderManager } from '@/services/llm/providerManager';

const manager = new LLMProviderManager();
manager.setProvider('together');
```

## Avantages

- **Open Source** : Modèle sous licence Apache 2.0
- **Enterprise Ready** : Capacités de raisonnement avancées
- **Flexibilité** : Déploiement on-premise possible
- **Transparence** : Code source accessible
- **Sécurité** : Contrôle total des données

## Comparaison avec les autres providers

| Provider | Modèle | Licence | Contexte | Prix |
|----------|--------|---------|----------|------|
| Together AI | GPT-OSS-120B | Apache 2.0 | 128K | $0.15/$0.60 |
| DeepSeek | DeepSeek-Coder | Propriétaire | 128K | $0.14/$0.28 |
| Synesia | Custom | Propriétaire | Variable | Variable |

## Tests

Les tests unitaires sont disponibles dans `src/services/llm/providers/together.test.ts`.

## Support

Pour plus d'informations sur l'API Together AI :
- [Documentation officielle](https://www.together.ai/docs)
- [Modèle GPT-OSS-120B](https://www.together.ai/models/gpt-oss-120b)
- [Pricing](https://www.together.ai/pricing) 