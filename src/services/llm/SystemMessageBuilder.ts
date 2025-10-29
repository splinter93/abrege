/**
 * SystemMessageBuilder - Construction intelligente des messages système
 * Gère l'injection des instructions système et templates contextuels des agents
 */

import { simpleLogger as logger } from '@/utils/logger';

export interface AgentSystemConfig {
  system_instructions?: string;
  context_template?: string;
  personality?: string;
  expertise?: string[];
  capabilities?: string[];
  // Compatibilité héritage
  instructions?: string;
}

export interface SystemMessageContext {
  type: string;
  name: string;
  id: string;
  content?: string;
  provider?: string; // ✅ NOUVEAU : Pour détecter le provider (xai, groq, etc.)
  [key: string]: unknown;
}

export interface SystemMessageResult {
  content: string;
  hasCustomInstructions: boolean;
  hasContextTemplate: boolean;
  hasPersonality: boolean;
  hasExpertise: boolean;
  hasCapabilities: boolean;
}

/**
 * Builder pour les messages système des agents
 * Centralise la logique d'injection des instructions système
 */
export class SystemMessageBuilder {
  private static instance: SystemMessageBuilder;

  static getInstance(): SystemMessageBuilder {
    if (!SystemMessageBuilder.instance) {
      SystemMessageBuilder.instance = new SystemMessageBuilder();
    }
    return SystemMessageBuilder.instance;
  }

  /**
   * Construit le message système complet pour un agent
   */
  buildSystemMessage(
    agentConfig: AgentSystemConfig,
    context: SystemMessageContext = { type: 'chat', name: 'Session', id: 'default' },
    fallbackTemplate: string = 'Tu es un assistant IA utile et bienveillant.'
  ): SystemMessageResult {
    let content = '';
    let hasCustomInstructions = false;
    let hasContextTemplate = false;
    let hasPersonality = false;
    let hasExpertise = false;
    let hasCapabilities = false;

    try {
      // 1. Instructions système personnalisées (priorité haute)
      const primaryInstructions = agentConfig.system_instructions?.trim();
      const legacyInstructions = agentConfig.instructions?.trim();
      
      if (primaryInstructions || legacyInstructions) {
        content = (primaryInstructions || legacyInstructions)!;
        hasCustomInstructions = true;
        logger.dev(`[SystemMessageBuilder] 🎯 Instructions système personnalisées utilisées`);
      } else {
        content = fallbackTemplate;
        logger.dev(`[SystemMessageBuilder] ⚙️ Template par défaut utilisé`);
      }

      // ✅ NOUVEAU : Instructions pour tool calls avec explication
      content += `\n\n## Utilisation des Outils

RÈGLE IMPORTANTE : Avant d'appeler un outil, tu DOIS TOUJOURS :
1. Expliquer brièvement ce que tu vas faire et pourquoi dans le champ "content"
2. Puis appeler l'outil dans le même message (content + tool_calls simultanés)
3. Après avoir reçu le résultat, commenter ce que tu as obtenu

Exemple de bon comportement :
- content: "Je vais chercher des informations sur X en utilisant l'outil Y..."
- tool_calls: [{ name: "Y", arguments: {...} }]

Puis après résultat :
- content: "J'ai trouvé que... [analyse du résultat]"

JAMAIS appeler un outil sans expliquer avant ce que tu fais. L'utilisateur doit comprendre ton processus de pensée.

Les outils sont détectés et exécutés automatiquement par l'API. Tu n'as qu'à expliquer ton intention dans ton message.

⚠️ ANTI-HALLUCINATION CRITIQUE ⚠️

RÈGLE ABSOLUE : N'invente JAMAIS de données avant d'avoir reçu le résultat d'un outil.

Comportement INTERDIT :
❌ "Je vais chercher une image de chat... [affiche une image inventée] ...Maintenant je cherche un chien..."
❌ Afficher des URLs, des images, des données, des résultats AVANT d'avoir appelé l'outil
❌ Prétendre avoir obtenu un résultat alors que l'outil n'a pas encore été exécuté

Comportement REQUIS :
✅ "Je vais chercher une image de chat..." [tool_call] → ATTENDRE LE RÉSULTAT
✅ Après réception : "J'ai obtenu cette image : [URL réelle du résultat]"
✅ Ne jamais afficher de contenu spécifique (URL, données, etc.) avant d'avoir le résultat réel

Si tu as besoin de plusieurs outils séquentiels :
1. Appelle le PREMIER outil UNIQUEMENT
2. ATTENDS le résultat
3. Commente le résultat obtenu
4. Puis appelle le SECOND outil si nécessaire
5. ATTENDS à nouveau

NE JAMAIS prévoir, inventer, ou afficher des résultats imaginaires. TOUJOURS attendre le résultat réel.

## Gestion des Erreurs

Si un outil échoue ou retourne une erreur :
1. NE PAS paniquer ou abandonner
2. Expliquer à l'utilisateur ce qui s'est passé de manière claire et rassurante
3. Proposer une alternative ou une solution de contournement
4. Si possible, réessayer avec des paramètres différents

Exemple de bonne gestion d'erreur :
- "L'outil X a rencontré un problème technique (détails : ...). Pas de souci, je vais essayer Y à la place."
- Ou : "La recherche n'a pas fonctionné comme prévu. Laisse-moi réessayer avec des paramètres ajustés."

TOUJOURS rester utile et positif, même quand les outils échouent. L'utilisateur compte sur toi pour gérer ces situations avec élégance.`;

      // ✅ FIX CRITIQUE : Instructions équilibrées pour Grok/xAI
      // Expliquer COMMENT utiliser les tools sans donner d'exemples de formats incorrects
      if (context && (context.provider === 'xai' || context.provider === 'grok')) {
        content += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ IMPORTANT - TU AS DES OUTILS DISPONIBLES ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tu as accès à des outils puissants via l'API OpenAI Function Calling.

QUAND UTILISER UN OUTIL :
- L'utilisateur te demande de faire une action concrète
- Tu as besoin de données externes (recherche, création, etc.)
- Tu dois manipuler des ressources (notes, images, fichiers)

COMMENT CELA FONCTIONNE :
1. Tu décides d'utiliser un outil selon le besoin de l'utilisateur
2. L'API te permet d'appeler l'outil via le mécanisme natif
3. Le système exécute l'outil automatiquement
4. Tu reçois le résultat dans le prochain message
5. Tu utilises ce résultat pour répondre à l'utilisateur

RAPPEL TECHNIQUE :
- Les tools sont définis dans le payload API
- Tu utilises le mécanisme standard OpenAI (pas de format custom)
- L'exécution est automatique et transparente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      }

      // ✅ Injection contexte UI compact (date, device, page)
      if (context && typeof context === 'object') {
        const ctx = context as import('@/types/llmContext').UIContext & {
          attachedNotes?: Array<{
            title: string;
            slug: string;
            markdown_content: string;
          }>;
        }; // ✅ Type strict (pas any)
        const contextParts: string[] = [];
        
        // Format ultra-compact avec emojis (comme AgentOrchestrator)
        if (ctx.time && ctx.device && ctx.user) {
          const deviceEmoji = ctx.device.type === 'mobile' ? '📱' : ctx.device.type === 'tablet' ? '📲' : '💻';
          const localeFlag = ctx.user.locale === 'fr' ? '🇫🇷' : '🇬🇧';
          contextParts.push(`📅 ${ctx.time.local} (${ctx.timezone || ctx.time.timezone}) | ${deviceEmoji} ${ctx.device.type} | ${localeFlag} ${ctx.user.locale.toUpperCase()}`);
          
          // Page actuelle
          if (ctx.page) {
            const pageEmojiMap: Record<string, string> = {
              chat: '💬',
              editor: '✍️',
              folder: '📁',
              classeur: '📚',
              home: '🏠'
            };
            const pageEmoji = pageEmojiMap[ctx.page.type] || '❓';
            contextParts.push(`${pageEmoji} ${ctx.page.type}${ctx.page.action ? ` (${ctx.page.action})` : ''}`);
          }
          
          // Contexte actif
          if (ctx.active?.note) {
            contextParts.push(`📝 Note: ${ctx.active.note.title}`);
          }
          if (ctx.active?.folder) {
            contextParts.push(`📁 Dossier: ${ctx.active.folder.name}`);
          }
          if (ctx.active?.classeur) {
            contextParts.push(`📚 Classeur: ${ctx.active.classeur.name}`);
          }
        }

        if (contextParts.length > 0) {
          content += `\n\n## Contexte Actuel\n${contextParts.join('\n')}`;
          content += `\n\n⚠️ Date/heure ci-dessus = MAINTENANT (actualisée automatiquement). Ne cherche pas l'heure ailleurs.`;
          logger.dev(`[SystemMessageBuilder] 🌍 Contexte UI injecté (compact)`);
        }
        
        // 📎 Ajouter les notes attachées (style Cursor)
        if (ctx.attachedNotes && Array.isArray(ctx.attachedNotes) && ctx.attachedNotes.length > 0) {
          content += `\n\n## 📎 Notes Attachées par l'Utilisateur\n\n`;
          content += `L'utilisateur a mentionné les notes suivantes avec @ (comme dans Cursor).\n`;
          content += `Tu DOIS te baser sur leur contenu pour répondre.\n\n`;
          
          // ✅ Type-safe: Cast inline pour chaque note
          ctx.attachedNotes.forEach((note: { title: string; slug: string; markdown_content: string }, index: number) => {
            content += `### Note ${index + 1}: ${note.title}\n`;
            content += `**Slug:** ${note.slug}\n\n`;
            content += `**Contenu:**\n\`\`\`markdown\n${note.markdown_content}\n\`\`\`\n\n`;
            content += `---\n\n`;
          });
          
          logger.dev(`[SystemMessageBuilder] 📎 ${ctx.attachedNotes.length} notes attachées ajoutées au contexte`);
        }
      }

      // 2. Template contextuel avec variables
      if (agentConfig.context_template) {
        try {
          const contextualContent = this.renderContextTemplate(agentConfig.context_template, context);
          if (contextualContent.trim()) {
            content = `${content}\n\n${contextualContent}`;
            hasContextTemplate = true;
            logger.dev(`[SystemMessageBuilder] 🌍 Template contextuel appliqué`);
          }
        } catch (error) {
          logger.error(`[SystemMessageBuilder] ❌ Erreur template contextuel:`, error);
        }
      }

      // 3. Personnalité (optionnel)
      if (agentConfig.personality?.trim()) {
        content += `\n\n## Personnalité\n${agentConfig.personality.trim()}`;
        hasPersonality = true;
        logger.dev(`[SystemMessageBuilder] 🎭 Personnalité ajoutée`);
      }

      // 4. Domaines d'expertise (optionnel)
      if (agentConfig.expertise && agentConfig.expertise.length > 0) {
        const expertiseList = agentConfig.expertise.filter(e => e?.trim()).join(', ');
        if (expertiseList) {
          content += `\n\n## Domaines d'expertise\n${expertiseList}`;
          hasExpertise = true;
          logger.dev(`[SystemMessageBuilder] 🎓 Expertise ajoutée`);
        }
      }

      // 5. Capacités (optionnel)
      if (agentConfig.capabilities && agentConfig.capabilities.length > 0) {
        const capabilitiesList = agentConfig.capabilities.filter(c => c?.trim()).join(', ');
        if (capabilitiesList) {
          content += `\n\n## Capacités\n${capabilitiesList}`;
          hasCapabilities = true;
          logger.dev(`[SystemMessageBuilder] 🔧 Capacités ajoutées`);
        }
      }

      logger.dev(`[SystemMessageBuilder] ✅ Message système construit (${content.length} chars)`, {
        hasCustomInstructions,
        hasContextTemplate,
        hasPersonality,
        hasExpertise,
        hasCapabilities
      });

      return {
        content: content.trim(),
        hasCustomInstructions,
        hasContextTemplate,
        hasPersonality,
        hasExpertise,
        hasCapabilities
      };

    } catch (error) {
      logger.error(`[SystemMessageBuilder] ❌ Erreur construction message système:`, error);
      
      // Fallback en cas d'erreur
      return {
        content: fallbackTemplate,
        hasCustomInstructions: false,
        hasContextTemplate: false,
        hasPersonality: false,
        hasExpertise: false,
        hasCapabilities: false
      };
    }
  }

  /**
   * Rend un template contextuel avec substitution de variables
   */
  private renderContextTemplate(template: string, context: SystemMessageContext): string {
    if (!template || !context) {
      return '';
    }

    try {
      // Substitution simple des variables {{variable}}
      let rendered = template;
      
      // Remplacer les variables du contexte
      Object.entries(context).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const placeholder = new RegExp(`{{${key}}}`, 'g');
          rendered = rendered.replace(placeholder, String(value));
        }
      });

      // Nettoyer les placeholders non remplacés
      rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');

      return rendered.trim();

    } catch (error) {
      logger.error(`[SystemMessageBuilder] ❌ Erreur rendu template contextuel:`, error);
      return '';
    }
  }

  /**
   * Valide la configuration d'un agent
   */
  validateAgentConfig(agentConfig: AgentSystemConfig): boolean {
    if (!agentConfig) {
      return false;
    }

    // Au moins une source d'instructions doit être présente
    const hasInstructions = !!(
      agentConfig.system_instructions?.trim() ||
      agentConfig.instructions?.trim() ||
      agentConfig.context_template?.trim()
    );

    return hasInstructions;
  }

  /**
   * Obtient un résumé de la configuration d'un agent
   */
  getAgentConfigSummary(agentConfig: AgentSystemConfig): string {
    const parts: string[] = [];

    if (agentConfig.system_instructions?.trim()) {
      parts.push(`Instructions: ${agentConfig.system_instructions.trim().substring(0, 50)}...`);
    }
    if (agentConfig.context_template?.trim()) {
      parts.push(`Template: ${agentConfig.context_template.trim().substring(0, 30)}...`);
    }
    if (agentConfig.personality?.trim()) {
      parts.push(`Personnalité: ${agentConfig.personality.trim().substring(0, 30)}...`);
    }
    if (agentConfig.expertise?.length) {
      parts.push(`Expertise: ${agentConfig.expertise.length} domaines`);
    }
    if (agentConfig.capabilities?.length) {
      parts.push(`Capacités: ${agentConfig.capabilities.length} items`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'Configuration par défaut';
  }
}

// Instance singleton
export const systemMessageBuilder = SystemMessageBuilder.getInstance();
