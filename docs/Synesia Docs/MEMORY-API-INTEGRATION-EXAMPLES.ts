/**
 * Exemples d'intégration de l'API Memory Synesia
 * Collection d'exemples pratiques pour différents cas d'usage
 */

interface MemoryConfig {
  baseUrl: string;
  apiKey: string;
  memoryId: string;
}

interface MemoryEntry {
  id: string;
  created_at: string;
  value: string;
  memory_id: string;
  metadata: {
    user_id?: string;
    username?: string;
    tags?: string[];
    extracted_at?: string;
    description?: string;
    source?: string;
    operation_id?: string;
    tool_call_id?: string;
    custom?: Record<string, unknown>;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatEvent {
  type: 'memory_results' | 'content' | 'done' | 'error';
  entries?: MemoryEntry[];
  count?: number;
  content?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Client de base pour l'API Memory Synesia
 */
class SynesiaMemoryClient {
  constructor(private config: MemoryConfig) {}

  private async apiCall(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'x-api-key': this.config.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Memory API error: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Liste les entrées mémoire avec pagination
   */
  async listEntries(limit = 50, offset = 0): Promise<{
    entries: MemoryEntry[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      has_more: boolean;
    };
  }> {
    const response = await this.apiCall(
      `/memory/${this.config.memoryId}/entries?limit=${limit}&offset=${offset}`
    );

    return {
      entries: response.data,
      pagination: response.pagination
    };
  }

  /**
   * Crée une nouvelle entrée mémoire
   */
  async createEntry(
    content: string,
    metadata: Partial<MemoryEntry['metadata']> = {}
  ): Promise<string> {
    const response = await this.apiCall(
      `/memory/${this.config.memoryId}/entries`,
      {
        method: 'POST',
        body: JSON.stringify({ content, metadata })
      }
    );

    return response.data.entry_id;
  }

  /**
   * Recherche sémantique dans la mémoire
   */
  async search(query: string, topK = 5): Promise<MemoryEntry[]> {
    const response = await this.apiCall(
      `/memory/${this.config.memoryId}/search`,
      {
        method: 'POST',
        body: JSON.stringify({ query, top_k: topK })
      }
    );

    return response.data;
  }

  /**
   * Supprime une entrée mémoire
   */
  async deleteEntry(entryId: string): Promise<boolean> {
    const response = await this.apiCall(
      `/memory/${this.config.memoryId}/entries/${entryId}`,
      { method: 'DELETE' }
    );

    return response.data;
  }

  /**
   * Traite automatiquement un texte pour en extraire des informations
   */
  async processText(text: string): Promise<string[]> {
    const response = await this.apiCall(
      `/memory/${this.config.memoryId}/process`,
      {
        method: 'POST',
        body: JSON.stringify({ text })
      }
    );

    return response.data;
  }

  /**
   * Chat avec RAG (streaming)
   */
  async *chat(
    messages: ChatMessage[],
    instructions = "Tu es un assistant utile.",
    modelId = "gpt-4o-mini"
  ): AsyncGenerator<ChatEvent> {
    const response = await fetch(
      `${this.config.baseUrl}/memory/${this.config.memoryId}/chat`,
      {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          instructions,
          llm_model_id: modelId
        })
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Chat API error: ${error.error || response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const events = chunk.split('\n\n').filter(line => line.startsWith('data: '));

      for (const event of events) {
        try {
          const data = JSON.parse(event.replace('data: ', ''));
          yield this.mapChatEvent(data);
        } catch (e) {
          // Ignore invalid JSON
        }
      }
    }
  }

  private mapChatEvent(data: any): ChatEvent {
    switch (data.type) {
      case 'memory.search.results':
        return {
          type: 'memory_results',
          entries: data.data.entries,
          count: data.data.count
        };
      case 'chunk':
        return {
          type: 'content',
          content: data.content
        };
      case 'end':
        return {
          type: 'done',
          usage: data.usage
        };
      default:
        return {
          type: 'error',
          error: { message: 'Unknown event type', code: 'UNKNOWN_EVENT' }
        };
    }
  }
}

/**
 * Exemple 1: Système de FAQ intelligent
 */
export class IntelligentFAQSystem {
  constructor(private client: SynesiaMemoryClient) {}

  async addFAQ(
    question: string,
    answer: string,
    category = 'general',
    tags: string[] = []
  ): Promise<string> {
    const content = `Q: ${question}\nA: ${answer}`;

    return await this.client.createEntry(content, {
      tags: ['faq', category, ...tags],
      source: 'faq_system',
      description: `FAQ: ${question.substring(0, 50)}...`,
      custom: {
        question,
        answer,
        category,
        type: 'faq'
      }
    });
  }

  async searchFAQs(query: string, maxResults = 3): Promise<Array<{
    question: string;
    answer: string;
    category: string;
    entry: MemoryEntry;
    relevanceScore: number;
  }>> {
    const results = await this.client.search(query, maxResults * 2); // Chercher plus pour filtrer

    // Filtrer seulement les FAQs et calculer la pertinence
    const faqs = results
      .filter(entry => entry.metadata.tags?.includes('faq'))
      .map(entry => ({
        question: entry.metadata.custom?.question as string,
        answer: entry.metadata.custom?.answer as string,
        category: entry.metadata.custom?.category as string,
        entry,
        relevanceScore: this.calculateRelevance(query, entry.value)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);

    return faqs;
  }

  private calculateRelevance(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);

    let matches = 0;
    for (const queryWord of queryWords) {
      if (contentWords.some(contentWord =>
        contentWord.includes(queryWord) || queryWord.includes(contentWord)
      )) {
        matches++;
      }
    }

    return matches / queryWords.length;
  }

  async getAnswer(query: string): Promise<{
    found: boolean;
    answer?: string;
    category?: string;
    confidence: number;
    suggestions?: string[];
  }> {
    const faqs = await this.searchFAQs(query, 3);

    if (faqs.length === 0) {
      return {
        found: false,
        confidence: 0
      };
    }

    const bestMatch = faqs[0];

    return {
      found: true,
      answer: bestMatch.answer,
      category: bestMatch.category,
      confidence: bestMatch.relevanceScore,
      suggestions: faqs.slice(1).map(faq => faq.question)
    };
  }
}

// Utilisation
export async function exampleFAQSystem() {
  const client = new SynesiaMemoryClient({
    baseUrl: 'https://origins-server.up.railway.app',
    apiKey: process.env.SYNESIA_API_KEY!,
    memoryId: 'faq-memory-id'
  });

  const faqSystem = new IntelligentFAQSystem(client);

  // Ajouter des FAQs
  await faqSystem.addFAQ(
    "Comment créer un compte ?",
    "Allez sur la page d'inscription et remplissez le formulaire avec votre email.",
    'account',
    ['inscription', 'signup']
  );

  await faqSystem.addFAQ(
    "Quels sont les tarifs ?",
    "Nous proposons : Gratuit (limité), Pro (9.99€/mois), Entreprise (sur devis).",
    'pricing',
    ['prix', 'coût']
  );

  // Recherche
  const answer = await faqSystem.getAnswer("comment m'inscrire");
  console.log('Réponse:', answer.answer);
  console.log('Confiance:', `${(answer.confidence * 100).toFixed(1)}%`);
}

/**
 * Exemple 2: Agent de veille technologique
 */
export class TechWatchAgent {
  constructor(private client: SynesiaMemoryClient) {}

  async processArticle(url: string, title: string, content: string): Promise<string[]> {
    // Traiter automatiquement l'article
    const entryIds = await this.client.processText(content);

    // Enrichir avec les métadonnées
    for (const entryId of entryIds) {
      // Note: Dans un vrai système, on récupérerait l'entrée et on la mettrait à jour
      // Pour l'exemple, on crée une nouvelle entrée enrichie
      await this.client.createEntry(
        `Article: ${title}\n\nExtrait: ${content.substring(0, 500)}...`,
        {
          tags: ['tech_watch', 'article', 'processed'],
          source: url,
          description: `Veille tech: ${title}`,
          extracted_at: new Date().toISOString(),
          custom: {
            original_url: url,
            title,
            processed_at: new Date().toISOString(),
            type: 'tech_article'
          }
        }
      );
    }

    return entryIds;
  }

  async getTechInsights(query: string): Promise<{
    insights: string[];
    sources: string[];
    trends: string[];
  }> {
    const results = await this.client.search(query, 10);

    const insights: string[] = [];
    const sources: Set<string> = new Set();
    const trends: Set<string> = new Set();

    for (const result of results) {
      if (result.metadata.tags?.includes('tech_watch')) {
        insights.push(result.value);
        if (result.metadata.source) {
          sources.add(result.metadata.source);
        }
        // Extraire des tendances du contenu (simplifié)
        const techTerms = this.extractTechTerms(result.value);
        techTerms.forEach(term => trends.add(term));
      }
    }

    return {
      insights: insights.slice(0, 5),
      sources: Array.from(sources),
      trends: Array.from(trends).slice(0, 10)
    };
  }

  private extractTechTerms(text: string): string[] {
    // Liste simplifiée de termes tech (dans un vrai système, utiliser NLP)
    const techTerms = [
      'IA', 'intelligence artificielle', 'machine learning', 'deep learning',
      'blockchain', 'cryptomonnaie', 'NFT', 'metaverse',
      'quantum', 'edge computing', 'serverless', 'microservices',
      'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Rust'
    ];

    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const term of techTerms) {
      if (lowerText.includes(term.toLowerCase())) {
        found.push(term);
      }
    }

    return found;
  }

  async generateTechReport(): Promise<string> {
    const recentArticles = await this.client.search('technologie innovation', 20);

    let report = '# Rapport de Veille Technologique\n\n';

    // Grouper par tendances
    const trends = new Map<string, MemoryEntry[]>();

    for (const article of recentArticles) {
      const terms = this.extractTechTerms(article.value);
      for (const term of terms) {
        if (!trends.has(term)) {
          trends.set(term, []);
        }
        trends.get(term)!.push(article);
      }
    }

    // Générer le rapport
    for (const [trend, articles] of trends) {
      report += `## ${trend} (${articles.length} articles)\n\n`;

      for (const article of articles.slice(0, 3)) {
        const date = new Date(article.created_at).toLocaleDateString('fr-FR');
        report += `- **${date}**: ${article.value.substring(0, 200)}...\n`;
      }

      report += '\n';
    }

    return report;
  }
}

// Utilisation
export async function exampleTechWatch() {
  const client = new SynesiaMemoryClient({
    baseUrl: 'https://origins-server.up.railway.app',
    apiKey: process.env.SYNESIA_API_KEY!,
    memoryId: 'tech-watch-memory-id'
  });

  const techAgent = new TechWatchAgent(client);

  // Traiter un article
  await techAgent.processArticle(
    'https://techcrunch.com/ai-advances-2024',
    'Les avancées de l\'IA en 2024',
    'L\'intelligence artificielle continue de progresser rapidement...'
  );

  // Obtenir des insights
  const insights = await techAgent.getTechInsights('IA generative');
  console.log('Tendances IA:', insights.trends);

  // Générer un rapport
  const report = await techAgent.generateTechReport();
  console.log('Rapport généré:', report.length, 'caractères');
}

/**
 * Exemple 3: Chatbot contextuel avec mémoire persistante
 */
export class ContextualChatbot {
  private conversationHistory: ChatMessage[] = [];
  private userProfile: Map<string, any> = new Map();

  constructor(
    private client: SynesiaMemoryClient,
    private userId: string
  ) {}

  async sendMessage(message: string): Promise<string> {
    // Ajouter à l'historique
    this.conversationHistory.push({ role: 'user', content: message });

    // Garder seulement les 20 derniers messages
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }

    // Rechercher dans la mémoire personnelle de l'utilisateur
    const personalContext = await this.client.search(
      `user_${this.userId} ${message}`,
      3
    );

    // Créer le contexte enrichi
    let enrichedInstructions = `Tu es un assistant personnalisé pour l'utilisateur ${this.userId}.`;

    if (personalContext.length > 0) {
      enrichedInstructions += '\n\nContexte personnel pertinent :\n';
      for (const entry of personalContext) {
        enrichedInstructions += `- ${entry.value}\n`;
      }
    }

    // Chat avec RAG
    let fullResponse = '';
    const events = this.client.chat(
      this.conversationHistory,
      enrichedInstructions,
      'gpt-4o-mini'
    );

    for await (const event of events) {
      if (event.type === 'content') {
        fullResponse += event.content;
      }
    }

    // Ajouter la réponse à l'historique
    this.conversationHistory.push({ role: 'assistant', content: fullResponse });

    // Mémoriser cette interaction si elle est importante
    if (this.isImportantConversation(message, fullResponse)) {
      await this.client.createEntry(
        `Conversation: ${message} → ${fullResponse}`,
        {
          user_id: this.userId,
          tags: ['conversation', 'personal'],
          source: 'chat_interaction',
          custom: {
            user_id: this.userId,
            importance: 'high',
            topics: this.extractTopics(message)
          }
        }
      );
    }

    return fullResponse;
  }

  private isImportantConversation(userMsg: string, assistantResponse: string): boolean {
    // Critères d'importance
    const hasQuestion = userMsg.includes('?');
    const longResponse = assistantResponse.length > 300;
    const hasKeywords = /\b(comment|pourquoi|quand|où|qui|quoi)\b/i.test(userMsg);

    return hasQuestion || longResponse || hasKeywords;
  }

  private extractTopics(message: string): string[] {
    const topics: string[] = [];

    // Mots-clés simples (dans un vrai système, utiliser NLP)
    const keywords = {
      'travail': ['travail', 'job', 'carrière', 'profession'],
      'santé': ['santé', 'médecin', 'maladie', 'bien-être'],
      'finance': ['argent', 'budget', 'investissement', 'banque'],
      'loisirs': ['voyage', 'sport', 'musique', 'cinéma'],
      'tech': ['ordinateur', 'téléphone', 'internet', 'application']
    };

    const lowerMsg = message.toLowerCase();

    for (const [topic, words] of Object.entries(keywords)) {
      if (words.some(word => lowerMsg.includes(word))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  async learnUserPreference(key: string, value: any): Promise<void> {
    this.userProfile.set(key, value);

    // Mémoriser la préférence
    await this.client.createEntry(
      `Préférence utilisateur: ${key} = ${JSON.stringify(value)}`,
      {
        user_id: this.userId,
        tags: ['preference', 'profile'],
        source: 'user_learning',
        custom: {
          user_id: this.userId,
          preference_key: key,
          preference_value: value
        }
      }
    );
  }

  getUserPreference(key: string): any {
    return this.userProfile.get(key);
  }

  async getConversationSummary(): Promise<string> {
    const conversations = await this.client.search(
      `user_${this.userId} conversation`,
      10
    );

    let summary = `Résumé des conversations récentes pour l'utilisateur ${this.userId}:\n\n`;

    for (const conv of conversations.slice(0, 5)) {
      const date = new Date(conv.created_at).toLocaleDateString('fr-FR');
      summary += `- ${date}: ${conv.value.substring(0, 100)}...\n`;
    }

    return summary;
  }
}

// Utilisation
export async function exampleContextualChatbot() {
  const client = new SynesiaMemoryClient({
    baseUrl: 'https://origins-server.up.railway.app',
    apiKey: process.env.SYNESIA_API_KEY!,
    memoryId: 'user-memory-id'
  });

  const chatbot = new ContextualChatbot(client, 'user123');

  // Apprendre des préférences
  await chatbot.learnUserPreference('favorite_color', 'bleu');
  await chatbot.learnUserPreference('preferred_language', 'français');

  // Conversation
  const response1 = await chatbot.sendMessage("Quelle est ma couleur préférée ?");
  console.log('Réponse 1:', response1);

  const response2 = await chatbot.sendMessage("Raconte-moi une blague en français.");
  console.log('Réponse 2:', response2);

  // Résumé
  const summary = await chatbot.getConversationSummary();
  console.log('Résumé:', summary);
}

/**
 * Exemple 4: Système de recommandation basé sur l'historique
 */
export class RecommendationEngine {
  constructor(private client: SynesiaMemoryClient) {}

  async trackUserAction(
    userId: string,
    action: string,
    itemId: string,
    itemType: string,
    metadata: any = {}
  ): Promise<void> {
    await this.client.createEntry(
      `Action utilisateur: ${action} ${itemType} ${itemId}`,
      {
        user_id: userId,
        tags: ['user_action', action, itemType],
        source: 'recommendation_system',
        custom: {
          user_id: userId,
          action,
          item_id: itemId,
          item_type: itemType,
          ...metadata
        }
      }
    );
  }

  async getUserPreferences(userId: string): Promise<Map<string, number>> {
    const actions = await this.client.search(`user_${userId} action`, 50);

    const preferences = new Map<string, number>();

    for (const action of actions) {
      const custom = action.metadata.custom as any;
      if (custom?.action === 'like' || custom?.action === 'purchase') {
        const itemType = custom.item_type;
        const current = preferences.get(itemType) || 0;
        preferences.set(itemType, current + 1);
      }
    }

    return preferences;
  }

  async recommendForUser(
    userId: string,
    itemType: string,
    maxRecommendations = 5
  ): Promise<Array<{
    itemId: string;
    score: number;
    reason: string;
  }>> {
    // Obtenir les préférences de l'utilisateur
    const preferences = await this.getUserPreferences(userId);

    // Trouver des utilisateurs similaires
    const similarUsers = await this.findSimilarUsers(userId, itemType);

    // Calculer les recommandations
    const recommendations = new Map<string, { score: number; reasons: string[] }>();

    for (const similarUser of similarUsers) {
      const similarActions = await this.client.search(
        `user_${similarUser.userId} like ${itemType}`,
        20
      );

      for (const action of similarActions) {
        const custom = action.metadata.custom as any;
        if (custom?.item_type === itemType) {
          const itemId = custom.item_id;
          const similarity = similarUser.similarity;

          if (!recommendations.has(itemId)) {
            recommendations.set(itemId, { score: 0, reasons: [] });
          }

          const rec = recommendations.get(itemId)!;
          rec.score += similarity;
          rec.reasons.push(`Aimé par un utilisateur similaire (${(similarity * 100).toFixed(0)}% similarité)`);
        }
      }
    }

    // Trier et retourner les meilleures recommandations
    return Array.from(recommendations.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, maxRecommendations)
      .map(([itemId, data]) => ({
        itemId,
        score: data.score,
        reason: data.reasons[0] // Simplifié, prendre la première raison
      }));
  }

  private async findSimilarUsers(
    targetUserId: string,
    itemType: string,
    maxSimilar = 10
  ): Promise<Array<{ userId: string; similarity: number }>> {
    // Dans un vrai système, ceci serait plus sophistiqué
    // Pour l'exemple, on cherche des utilisateurs avec des goûts similaires

    const targetPreferences = await this.getUserPreferences(targetUserId);
    const allUsers = new Set<string>();

    // Collecter tous les utilisateurs qui ont interagi avec ce type d'item
    const actions = await this.client.search(`${itemType} action`, 100);
    for (const action of actions) {
      if (action.metadata.user_id && action.metadata.user_id !== targetUserId) {
        allUsers.add(action.metadata.user_id);
      }
    }

    const similarUsers: Array<{ userId: string; similarity: number }> = [];

    for (const userId of allUsers) {
      const userPreferences = await this.getUserPreferences(userId);
      const similarity = this.calculatePreferenceSimilarity(targetPreferences, userPreferences);
      similarUsers.push({ userId, similarity });
    }

    return similarUsers
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxSimilar);
  }

  private calculatePreferenceSimilarity(
    prefs1: Map<string, number>,
    prefs2: Map<string, number>
  ): number {
    const allKeys = new Set([...prefs1.keys(), ...prefs2.keys()]);
    let similarity = 0;
    let total = 0;

    for (const key of allKeys) {
      const val1 = prefs1.get(key) || 0;
      const val2 = prefs2.get(key) || 0;

      // Similarité cosinus simplifiée
      similarity += val1 * val2;
      total += Math.sqrt(val1 * val1) * Math.sqrt(val2 * val2);
    }

    return total > 0 ? similarity / total : 0;
  }
}

// Utilisation
export async function exampleRecommendationEngine() {
  const client = new SynesiaMemoryClient({
    baseUrl: 'https://origins-server.up.railway.app',
    apiKey: process.env.SYNESIA_API_KEY!,
    memoryId: 'recommendation-memory-id'
  });

  const recommender = new RecommendationEngine(client);

  // Suivre des actions utilisateur
  await recommender.trackUserAction('user123', 'like', 'movie_456', 'movie', {
    genre: 'sci-fi',
    rating: 5
  });

  await recommender.trackUserAction('user123', 'purchase', 'book_789', 'book', {
    genre: 'fantasy',
    price: 25.99
  });

  // Obtenir des recommandations
  const movieRecommendations = await recommender.recommendForUser('user123', 'movie');
  console.log('Films recommandés:', movieRecommendations);

  const bookRecommendations = await recommender.recommendForUser('user123', 'book');
  console.log('Livres recommandés:', bookRecommendations);
}

/**
 * Exemple 5: Traitement automatique de documents
 */
export class DocumentProcessor {
  constructor(private client: SynesiaMemoryClient) {}

  async processDocument(
    documentContent: string,
    metadata: {
      title: string;
      author?: string;
      type: 'article' | 'book' | 'report' | 'presentation';
      tags?: string[];
      source?: string;
    }
  ): Promise<{
    entryIds: string[];
    summary: string;
    keyPoints: string[];
    topics: string[];
  }> {
    // Traiter automatiquement le document
    const entryIds = await this.client.processText(documentContent);

    // Créer une entrée de résumé
    const summaryEntryId = await this.client.createEntry(
      `Document: ${metadata.title}\n\nRésumé automatique généré à partir du contenu.`,
      {
        tags: ['document', metadata.type, 'processed', ...(metadata.tags || [])],
        source: metadata.source,
        description: `Document traité: ${metadata.title}`,
        custom: {
          title: metadata.title,
          author: metadata.author,
          document_type: metadata.type,
          processing_date: new Date().toISOString(),
          original_length: documentContent.length,
          extracted_entries: entryIds.length
        }
      }
    );

    // Analyse basique du document (dans un vrai système, utiliser NLP)
    const keyPoints = this.extractKeyPoints(documentContent);
    const topics = this.extractTopics(documentContent);

    return {
      entryIds: [...entryIds, summaryEntryId],
      summary: `Document "${metadata.title}" traité avec succès. ${entryIds.length} extraits générés.`,
      keyPoints,
      topics
    };
  }

  private extractKeyPoints(content: string): string[] {
    // Très simplifié - dans un vrai système, utiliser des algorithmes NLP
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);

    // Considérer les phrases longues comme des points clés
    return sentences
      .filter(sentence => sentence.length > 50)
      .slice(0, 5)
      .map(s => s.trim());
  }

  private extractTopics(content: string): string[] {
    // Liste simplifiée de sujets
    const topicKeywords = {
      'intelligence_artificielle': ['IA', 'intelligence artificielle', 'machine learning', 'deep learning', 'neural network'],
      'blockchain': ['blockchain', 'cryptomonnaie', 'bitcoin', 'ethereum', 'NFT'],
      'cybersécurité': ['sécurité', 'cyber', 'hacking', 'encryption', 'privacy'],
      'cloud_computing': ['cloud', 'AWS', 'Azure', 'GCP', 'serverless'],
      'développement': ['programmation', 'code', 'développement', 'API', 'framework']
    };

    const foundTopics: string[] = [];
    const lowerContent = content.toLowerCase();

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        foundTopics.push(topic);
      }
    }

    return foundTopics;
  }

  async searchDocuments(query: string): Promise<Array<{
    title: string;
    type: string;
    relevance: number;
    keyPoints: string[];
    entry: MemoryEntry;
  }>> {
    const results = await this.client.search(query, 20);

    return results
      .filter(entry => entry.metadata.tags?.includes('document'))
      .map(entry => ({
        title: (entry.metadata.custom as any)?.title || 'Document sans titre',
        type: (entry.metadata.custom as any)?.document_type || 'unknown',
        relevance: this.calculateDocumentRelevance(query, entry.value),
        keyPoints: this.extractKeyPoints(entry.value),
        entry
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);
  }

  private calculateDocumentRelevance(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);

    let matches = 0;
    for (const queryWord of queryWords) {
      if (contentWords.some(contentWord => contentWord.includes(queryWord))) {
        matches++;
      }
    }

    return matches / queryWords.length;
  }
}

// Utilisation
export async function exampleDocumentProcessor() {
  const client = new SynesiaMemoryClient({
    baseUrl: 'https://origins-server.up.railway.app',
    apiKey: process.env.SYNESIA_API_KEY!,
    memoryId: 'documents-memory-id'
  });

  const processor = new DocumentProcessor(client);

  // Traiter un document
  const result = await processor.processDocument(
    `
    L'intelligence artificielle révolutionne le monde moderne.
    Les avancées en machine learning permettent de résoudre des problèmes complexes.
    La cybersécurité devient cruciale avec l'adoption massive du cloud computing.
    Les développeurs doivent maîtriser de nouveaux frameworks et APIs.
    `,
    {
      title: "L'IA dans le monde moderne",
      author: "Jean Dupont",
      type: "article",
      tags: ["IA", "technologie"],
      source: "blog.tech.com"
    }
  );

  console.log('Document traité:', result.summary);
  console.log('Sujets identifiés:', result.topics);

  // Rechercher dans les documents
  const searchResults = await processor.searchDocuments('intelligence artificielle');
  console.log('Documents trouvés:', searchResults.length);
}
