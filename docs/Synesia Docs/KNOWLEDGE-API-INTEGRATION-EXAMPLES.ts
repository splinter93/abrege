/**
 * Exemples d'intégration de l'API Knowledge Synesia
 * Collection d'exemples pratiques pour différents cas d'usage
 */

interface KnowledgeConfig {
  baseUrl: string;
  apiKey: string;
  knowledgeId?: string;
}

interface Knowledge {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface SearchResult {
  id: string;
  content: string;
  score?: number;
  metadata?: Record<string, unknown>;
  datasetId?: string;
}

interface AskResult {
  answer: string;
  entries: SearchResult[];
  usage?: {
    embedding_model_id?: string;
    llm_model_id?: string;
    top_k?: number;
    top_n?: number;
    total_entries_considered?: number;
  };
  debug?: any;
  llm_error?: string;
}

interface ImportOptions {
  chunkingMethod?: {
    type: 'fixed-length' | 'sentence-based' | 'statistical' | 'cumulative';
    params?: Record<string, any>;
  };
  sourceExtraction?: {
    provider: string;
    params?: Record<string, any>;
  };
}

interface ImportResult {
  success: boolean;
  entriesCreated?: number;
  error?: string;
}

/**
 * Client de base pour l'API Knowledge Synesia
 */
class SynesiaKnowledgeClient {
  constructor(private config: KnowledgeConfig) {}

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
      throw new Error(`Knowledge API error: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  // Gestion des knowledges
  async listKnowledges(): Promise<Knowledge[]> {
    return this.apiCall('/knowledges');
  }

  async createKnowledge(name: string, description?: string): Promise<Knowledge> {
    return this.apiCall('/knowledges', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
  }

  async getKnowledge(knowledgeId: string): Promise<Knowledge> {
    return this.apiCall(`/knowledges/${knowledgeId}`);
  }

  async updateKnowledge(
    knowledgeId: string,
    updates: Partial<Knowledge>
  ): Promise<Knowledge> {
    return this.apiCall(`/knowledges/${knowledgeId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async deleteKnowledge(knowledgeId: string): Promise<void> {
    await this.apiCall(`/knowledges/${knowledgeId}`, { method: 'DELETE' });
  }

  // Gestion des entries
  async listEntries(knowledgeId: string, limit = 50, offset = 0): Promise<{
    data: any[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      has_more: boolean;
    };
  }> {
    return this.apiCall(`/knowledges/${knowledgeId}/entries?limit=${limit}&offset=${offset}`);
  }

  async createEntry(
    knowledgeId: string,
    content: string,
    metadata: Record<string, unknown> = {}
  ): Promise<{ entry_id: string }> {
    return this.apiCall(`/knowledges/${knowledgeId}/entries`, {
      method: 'POST',
      body: JSON.stringify({ content, metadata })
    });
  }

  async getEntry(knowledgeId: string, entryId: string): Promise<any> {
    return this.apiCall(`/knowledges/${knowledgeId}/entries/${entryId}`);
  }

  async updateEntry(
    knowledgeId: string,
    entryId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<any> {
    return this.apiCall(`/knowledges/${knowledgeId}/entries/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content, metadata })
    });
  }

  async deleteEntry(knowledgeId: string, entryId: string): Promise<void> {
    await this.apiCall(`/knowledges/${knowledgeId}/entries/${entryId}`, { method: 'DELETE' });
  }

  // Recherche et QA
  async search(knowledgeId: string, query: string, topK = 5): Promise<{
    context?: string;
    entries: SearchResult[];
  }> {
    return this.apiCall(`/knowledges/${knowledgeId}/search`, {
      method: 'POST',
      body: JSON.stringify({ query, top_k: topK })
    });
  }

  async ask(
    knowledgeId: string,
    query: string,
    options: {
      topK?: number;
      topN?: number;
      modelId?: string;
      instruction?: string;
      maxTokens?: number;
      debug?: boolean;
    } = {}
  ): Promise<AskResult> {
    const overrides: any = {};

    if (options.topK !== undefined) overrides.top_k = options.topK;
    if (options.topN !== undefined) overrides.top_n = options.topN;

    if (options.modelId || options.instruction || options.maxTokens) {
      overrides.llm = {};
      if (options.modelId) overrides.llm.model_id = options.modelId;
      if (options.instruction) overrides.llm.instruction = options.instruction;
      if (options.maxTokens) overrides.llm.max_tokens = options.maxTokens;
    }

    return this.apiCall(`/knowledges/${knowledgeId}/query`, {
      method: 'POST',
      body: JSON.stringify({
        query,
        overrides,
        debug: options.debug
      })
    });
  }

  // Import de données
  async importCSV(
    knowledgeId: string,
    file: File,
    method: any
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('method', JSON.stringify(method));

    const response = await fetch(
      `${this.config.baseUrl}/knowledges/${knowledgeId}/import/csv`,
      {
        method: 'POST',
        headers: { 'x-api-key': this.config.apiKey },
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(`Import failed: ${response.statusText}`);
    }

    return response.text();
  }

  async importTextFile(
    knowledgeId: string,
    filePath: string,
    chunkingMethod: any
  ): Promise<any> {
    return this.apiCall(`/knowledges/${knowledgeId}/import/text-file`, {
      method: 'POST',
      body: JSON.stringify({ file_path: filePath, chunkingMethod })
    });
  }

  async importDocument(
    knowledgeId: string,
    filePath: string,
    chunkingMethod: any,
    sourceExtraction: any
  ): Promise<any> {
    return this.apiCall(`/knowledges/${knowledgeId}/import/document`, {
      method: 'POST',
      body: JSON.stringify({ file_path: filePath, chunkingMethod, sourceExtraction })
    });
  }

  async importText(
    knowledgeId: string,
    content: string,
    chunkingMethod: any
  ): Promise<any> {
    return this.apiCall(`/knowledges/${knowledgeId}/import/text`, {
      method: 'POST',
      body: JSON.stringify({ content, chunkingMethod })
    });
  }
}

/**
 * Exemple 1: Système de documentation intelligente
 */
export class IntelligentDocumentationSystem {
  constructor(private client: SynesiaKnowledgeClient) {}

  async addDocumentation(
    knowledgeId: string,
    filePath: string,
    metadata: {
      title: string;
      version?: string;
      category?: string;
      tags?: string[];
    }
  ): Promise<void> {
    await this.client.importDocument(knowledgeId, filePath, {
      type: 'sentence-based',
      params: { maxLength: 800 }
    }, {
      provider: 'unstructured',
      params: { extract_images: false, extract_tables: true }
    });

    // Ajouter une entrée de métadonnées
    await this.client.createEntry(knowledgeId,
      `Documentation: ${metadata.title} (v${metadata.version || '1.0'})`,
      {
        type: 'documentation',
        title: metadata.title,
        version: metadata.version,
        category: metadata.category,
        tags: metadata.tags,
        imported_at: new Date().toISOString(),
        source: filePath
      }
    );
  }

  async searchDocumentation(
    knowledgeId: string,
    query: string,
    category?: string
  ): Promise<SearchResult[]> {
    const results = await this.client.search(knowledgeId, query, 10);

    // Filtrer par catégorie si spécifiée
    if (category) {
      return results.entries.filter(entry =>
        entry.metadata?.category === category
      );
    }

    return results.entries;
  }

  async askDocumentation(
    knowledgeId: string,
    question: string,
    context?: {
      version?: string;
      category?: string;
      includeExamples?: boolean;
    }
  ): Promise<AskResult> {
    let instruction = `Tu es un expert technique spécialisé dans la documentation.
Réponds de façon claire, précise et structurée.`;

    if (context?.includeExamples) {
      instruction += ` Inclut des exemples de code quand c'est pertinent.`;
    }

    if (context?.version) {
      instruction += ` Concentre-toi sur la version ${context.version}.`;
    }

    if (context?.category) {
      instruction += ` Concentre-toi sur la catégorie ${context.category}.`;
    }

    return this.client.ask(knowledgeId, question, {
      instruction,
      topK: 8,
      debug: false
    });
  }

  async getDocumentationStats(knowledgeId: string): Promise<{
    totalEntries: number;
    categories: Record<string, number>;
    versions: Record<string, number>;
    lastUpdated: string;
  }> {
    const entries = await this.getAllEntries(knowledgeId);

    const categories: Record<string, number> = {};
    const versions: Record<string, number> = {};
    let lastUpdated = '';

    for (const entry of entries) {
      const meta = entry.metadata;
      if (meta?.type === 'documentation') {
        // Stats des documents
        const category = meta.category as string;
        const version = meta.version as string;

        if (category) {
          categories[category] = (categories[category] || 0) + 1;
        }

        if (version) {
          versions[version] = (versions[version] || 0) + 1;
        }

        // Dernière mise à jour
        if (entry.created_at > lastUpdated) {
          lastUpdated = entry.created_at;
        }
      }
    }

    return {
      totalEntries: entries.length,
      categories,
      versions,
      lastUpdated
    };
  }

  private async getAllEntries(knowledgeId: string): Promise<any[]> {
    const allEntries: any[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await this.client.listEntries(knowledgeId, limit, offset);
      allEntries.push(...response.data);

      if (!response.pagination.has_more) break;
      offset += limit;
    }

    return allEntries;
  }
}

// Utilisation
export async function exampleDocumentationSystem() {
  const client = new SynesiaKnowledgeClient({
    baseUrl: 'https://origins-server.up.railway.app',
    apiKey: process.env.SYNESIA_API_KEY!,
    knowledgeId: 'docs-knowledge-id'
  });

  const docSystem = new IntelligentDocumentationSystem(client);

  // Ajouter de la documentation
  await docSystem.addDocumentation('docs-knowledge-id', '/path/to/api-guide.pdf', {
    title: 'Guide API Synesia',
    version: '2.1',
    category: 'api',
    tags: ['api', 'guide', 'reference']
  });

  // Rechercher dans la documentation
  const results = await docSystem.searchDocumentation(
    'docs-knowledge-id',
    'comment créer un agent',
    'api'
  );

  console.log('Résultats trouvés:', results.length);

  // Poser une question
  const answer = await docSystem.askDocumentation(
    'docs-knowledge-id',
    'Quelles sont les méthodes d\'authentification disponibles ?',
    { category: 'api', includeExamples: true }
  );

  console.log('Réponse:', answer.answer);

  // Statistiques
  const stats = await docSystem.getDocumentationStats('docs-knowledge-id');
  console.log('Stats documentation:', stats);
}

/**
 * Exemple 2: Chatbot spécialisé avec mémoire documentaire
 */
export class SpecializedChatbot {
  private conversationHistory: Array<{role: 'user'|'assistant', content: string, timestamp: string}> = [];

  constructor(
    private client: SynesiaKnowledgeClient,
    private knowledgeId: string,
    private domain: string
  ) {}

  async sendMessage(
    message: string,
    context?: {
      restrictToCategory?: string;
      includeCodeExamples?: boolean;
      technicalLevel?: 'beginner' | 'intermediate' | 'advanced';
    }
  ): Promise<{
    response: string;
    sources: SearchResult[];
    conversationId: string;
  }> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Ajouter à l'historique
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Construire le contexte de conversation récent
    const recentContext = this.getRecentContext();

    // Recherche dans la knowledge
    let searchQuery = message;
    if (recentContext) {
      searchQuery = `${recentContext} ${message}`;
    }

    if (context?.restrictToCategory) {
      // Filtrage par catégorie (limité car la recherche de base ne supporte pas les filtres avancés)
      searchQuery = `${searchQuery} ${context.restrictToCategory}`;
    }

    const searchResults = await this.client.search(this.knowledgeId, searchQuery, 5);

    // Construire l'instruction pour le LLM
    let instruction = `Tu es un assistant spécialisé en ${this.domain}.`;

    if (context?.technicalLevel) {
      const levelDescriptions = {
        beginner: 'Utilise un langage simple, explique les concepts de base.',
        intermediate: 'Assume des connaissances préalables, va plus en profondeur.',
        advanced: 'Utilise un langage technique, suppose une expertise du domaine.'
      };
      instruction += ` ${levelDescriptions[context.technicalLevel]}`;
    }

    if (context?.includeCodeExamples) {
      instruction += ' Inclut des exemples de code quand c\'est pertinent.';
    }

    if (recentContext) {
      instruction += `\\n\\nContexte de conversation récent :\\n${recentContext}`;
    }

    if (searchResults.entries.length > 0) {
      instruction += `\\n\\nInformations pertinentes de la base de connaissances :\\n`;
      searchResults.entries.forEach((entry, i) => {
        instruction += `${i + 1}. ${entry.content.substring(0, 200)}...\\n`;
      });
    }

    // Générer la réponse
    const qaResult = await this.client.ask(this.knowledgeId, message, {
      instruction,
      topK: 3,
      debug: false
    });

    const response = qaResult.answer;

    // Ajouter à l'historique
    this.conversationHistory.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    });

    // Mémoriser la conversation (optionnel)
    await this.storeConversation(conversationId, message, response, qaResult.entries);

    // Nettoyer l'historique si trop long
    this.cleanupHistory();

    return {
      response,
      sources: qaResult.entries,
      conversationId
    };
  }

  private getRecentContext(): string {
    const recent = this.conversationHistory.slice(-4); // Derniers 4 messages
    return recent.map(msg => `${msg.role}: ${msg.content}`).join('\\n');
  }

  private async storeConversation(
    conversationId: string,
    userMessage: string,
    assistantResponse: string,
    sources: SearchResult[]
  ): Promise<void> {
    const content = `Conversation ${conversationId}:
User: ${userMessage}
Assistant: ${assistantResponse}`;

    const metadata = {
      type: 'conversation',
      conversation_id: conversationId,
      domain: this.domain,
      sources_count: sources.length,
      sources_ids: sources.map(s => s.id),
      tags: ['conversation', this.domain],
      stored_at: new Date().toISOString()
    };

    await this.client.createEntry(this.knowledgeId, content, metadata);
  }

  private cleanupHistory(): void {
    // Garder seulement les 20 derniers messages
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }

  async getConversationHistory(conversationId?: string): Promise<any[]> {
    if (conversationId) {
      // Rechercher une conversation spécifique
      const results = await this.client.search(
        this.knowledgeId,
        `conversation ${conversationId}`,
        10
      );
      return results.entries;
    } else {
      // Retourner l'historique en mémoire
      return this.conversationHistory;
    }
  }

  async getDomainInsights(): Promise<{
    popularTopics: string[];
    commonQuestions: string[];
    knowledgeCoverage: number;
  }> {
    // Analyser les conversations stockées pour des insights
    const conversations = await this.client.search(
      this.knowledgeId,
      'conversation',
      50
    );

    const topics = new Map<string, number>();
    const questions: string[] = [];

    for (const conv of conversations.entries) {
      // Extraction simple de sujets (améliorable avec NLP)
      const content = conv.content.toLowerCase();

      // Détection de questions
      if (content.includes('?') || content.includes('comment') || content.includes('quoi')) {
        const question = conv.content.split('\\n')[0].replace('User: ', '');
        if (question.length < 200) {
          questions.push(question);
        }
      }

      // Comptage de mots-clés
      const keywords = ['api', 'fonction', 'erreur', 'configuration', 'authentification'];
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          topics.set(keyword, (topics.get(keyword) || 0) + 1);
        }
      }
    }

    const popularTopics = Array.from(topics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    return {
      popularTopics,
      commonQuestions: questions.slice(0, 10),
      knowledgeCoverage: conversations.entries.length
    };
  }
}

// Utilisation
export async function exampleSpecializedChatbot() {
  const client = new SynesiaKnowledgeClient({
    baseUrl: 'https://origins-server.up.railway.app',
    apiKey: process.env.SYNESIA_API_KEY!,
    knowledgeId: 'tech-support-knowledge'
  });

  const chatbot = new SpecializedChatbot(client, 'tech-support-knowledge', 'support technique');

  // Conversation
  const result1 = await chatbot.sendMessage(
    'J\'ai un problème avec l\'API d\'authentification',
    { technicalLevel: 'intermediate', includeCodeExamples: true }
  );

  console.log('Réponse:', result1.response);
  console.log('Sources utilisées:', result1.sources.length);

  const result2 = await chatbot.sendMessage(
    'Pouvez-vous me donner un exemple de code ?'
  );

  console.log('Réponse de suivi:', result2.response);

  // Insights
  const insights = await chatbot.getDomainInsights();
  console.log('Sujets populaires:', insights.popularTopics);
  console.log('Questions communes:', insights.commonQuestions.length);
}

/**
 * Exemple 3: Système de recherche et curation de contenu
 */
export class ContentCurationSystem {
  constructor(private client: SynesiaKnowledgeClient) {}

  async addContent(
    knowledgeId: string,
    content: {
      title: string;
      body: string;
      author?: string;
      source: string;
      publishedAt?: string;
      tags: string[];
      category: string;
      quality: 'high' | 'medium' | 'low';
    }
  ): Promise<void> {
    // Créer le contenu principal
    const fullContent = `
Titre: ${content.title}
Auteur: ${content.author || 'Anonyme'}
Source: ${content.source}
Publié: ${content.publishedAt || 'Date inconnue'}

${content.body}
    `.trim();

    await this.client.createEntry(knowledgeId, fullContent, {
      type: 'article',
      title: content.title,
      author: content.author,
      source: content.source,
      published_at: content.publishedAt,
      tags: content.tags,
      category: content.category,
      quality: content.quality,
      curated_at: new Date().toISOString(),
      word_count: content.body.split(/\s+/).length
    });

    // Créer des extraits pour de meilleures recherches
    const excerpts = this.extractExcerpts(content.body, 3);
    for (const excerpt of excerpts) {
      await this.client.createEntry(knowledgeId,
        `Extrait de "${content.title}": ${excerpt}`,
        {
          type: 'excerpt',
          parent_title: content.title,
          source: content.source,
          tags: content.tags,
          category: content.category,
          quality: content.quality,
          excerpt_position: excerpts.indexOf(excerpt)
        }
      );
    }
  }

  private extractExcerpts(text: string, count: number): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const excerpts: string[] = [];

    for (let i = 0; i < Math.min(count, sentences.length); i++) {
      const start = Math.max(0, i * 2); // Prendre tous les 2 phrases
      const excerpt = sentences.slice(start, start + 2).join('. ').trim();
      if (excerpt.length > 50) {
        excerpts.push(excerpt);
      }
    }

    return excerpts;
  }

  async searchContent(
    knowledgeId: string,
    query: string,
    filters: {
      category?: string;
      quality?: 'high' | 'medium' | 'low';
      source?: string;
      tags?: string[];
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<SearchResult[]> {
    const results = await this.client.search(knowledgeId, query, 20);

    return results.entries.filter(entry => {
      const meta = entry.metadata;

      // Filtres
      if (filters.category && meta?.category !== filters.category) return false;
      if (filters.quality && meta?.quality !== filters.quality) return false;
      if (filters.source && meta?.source !== filters.source) return false;
      if (filters.dateFrom && meta?.published_at < filters.dateFrom) return false;
      if (filters.dateTo && meta?.published_at > filters.dateTo) return false;

      // Tags (au moins un tag doit matcher)
      if (filters.tags && filters.tags.length > 0) {
        const entryTags = meta?.tags as string[] || [];
        if (!filters.tags.some(tag => entryTags.includes(tag))) return false;
      }

      return true;
    });
  }

  async generateContentSummary(
    knowledgeId: string,
    topic: string,
    options: {
      includeStats?: boolean;
      maxArticles?: number;
      focusOnQuality?: boolean;
    } = {}
  ): Promise<{
    summary: string;
    articles: SearchResult[];
    stats?: {
      totalArticles: number;
      categories: Record<string, number>;
      avgQuality: number;
      dateRange: { from: string; to: string };
    };
  }> {
    const filters: any = {};
    if (options.focusOnQuality) {
      filters.quality = 'high';
    }

    const articles = await this.searchContent(knowledgeId, topic, filters);
    const limitedArticles = articles.slice(0, options.maxArticles || 10);

    // Générer un résumé avec le LLM
    const articlesContext = limitedArticles.map((article, i) =>
      `${i + 1}. ${article.metadata?.title || 'Article sans titre'}: ${article.content.substring(0, 200)}...`
    ).join('\\n\\n');

    const summaryQuery = `
Voici une liste d'articles sur le sujet "${topic}":

${articlesContext}

Génère un résumé synthétique et informatif de ces articles.
Structure le résumé avec les points clés, les tendances identifiées, et les conclusions principales.
    `.trim();

    const summaryResult = await this.client.ask(knowledgeId, summaryQuery, {
      instruction: 'Tu es un expert en synthèse de contenu. Génère un résumé clair et structuré.',
      topK: 0, // Ne pas utiliser de contexte supplémentaire pour cette requête
      debug: false
    });

    const result: any = {
      summary: summaryResult.answer,
      articles: limitedArticles
    };

    if (options.includeStats) {
      result.stats = this.generateStats(articles);
    }

    return result;
  }

  private generateStats(articles: SearchResult[]): any {
    const categories: Record<string, number> = {};
    const qualities = [];
    const dates = [];

    for (const article of articles) {
      const meta = article.metadata;

      // Catégories
      const category = meta?.category as string;
      if (category) {
        categories[category] = (categories[category] || 0) + 1;
      }

      // Qualités
      const quality = meta?.quality as string;
      if (quality) {
        const qualityScore = { high: 3, medium: 2, low: 1 }[quality] || 0;
        qualities.push(qualityScore);
      }

      // Dates
      const publishedAt = meta?.published_at as string;
      if (publishedAt) {
        dates.push(publishedAt);
      }
    }

    const sortedDates = dates.sort();
    const avgQuality = qualities.length > 0
      ? qualities.reduce((a, b) => a + b, 0) / qualities.length
      : 0;

    return {
      totalArticles: articles.length,
      categories,
      avgQuality,
      dateRange: {
        from: sortedDates[0] || '',
        to: sortedDates[sortedDates.length - 1] || ''
      }
    };
  }

  async getContentAnalytics(knowledgeId: string): Promise<{
    totalContent: number;
    categoriesBreakdown: Record<string, number>;
    qualityDistribution: Record<string, number>;
    topSources: Array<{source: string, count: number}>;
    contentGrowth: Array<{month: string, count: number}>;
  }> {
    const allEntries = await this.getAllEntries(knowledgeId);

    const categories: Record<string, number> = {};
    const qualities: Record<string, number> = {};
    const sources: Record<string, number> = {};
    const monthlyGrowth: Record<string, number> = {};

    for (const entry of allEntries) {
      const meta = entry.metadata;

      // Catégories
      const category = meta?.category as string;
      if (category) {
        categories[category] = (categories[category] || 0) + 1;
      }

      // Qualités
      const quality = meta?.quality as string;
      if (quality) {
        qualities[quality] = (qualities[quality] || 0) + 1;
      }

      // Sources
      const source = meta?.source as string;
      if (source) {
        sources[source] = (sources[source] || 0) + 1;
      }

      // Croissance mensuelle
      const createdAt = entry.created_at;
      if (createdAt) {
        const month = createdAt.substring(0, 7); // YYYY-MM
        monthlyGrowth[month] = (monthlyGrowth[month] || 0) + 1;
      }
    }

    const topSources = Object.entries(sources)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([source, count]) => ({ source, count }));

    const contentGrowth = Object.entries(monthlyGrowth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));

    return {
      totalContent: allEntries.length,
      categoriesBreakdown: categories,
      qualityDistribution: qualities,
      topSources,
      contentGrowth
    };
  }

  private async getAllEntries(knowledgeId: string): Promise<any[]> {
    const allEntries: any[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await this.client.listEntries(knowledgeId, limit, offset);
      allEntries.push(...response.data);

      if (!response.pagination.has_more) break;
      offset += limit;
    }

    return allEntries;
  }
}

// Utilisation
export async function exampleContentCuration() {
  const client = new SynesiaKnowledgeClient({
    baseUrl: 'https://origins-server.up.railway.app',
    apiKey: process.env.SYNESIA_API_KEY!,
    knowledgeId: 'content-curation-knowledge'
  });

  const curationSystem = new ContentCurationSystem(client);

  // Ajouter du contenu
  await curationSystem.addContent('content-curation-knowledge', {
    title: 'Les avancées en IA générative',
    body: 'L\'intelligence artificielle générative a fait des progrès significatifs...',
    author: 'Jean Dupont',
    source: 'tech-blog.com',
    publishedAt: '2024-12-15T10:00:00Z',
    tags: ['ia', 'generative', 'technologie'],
    category: 'technology',
    quality: 'high'
  });

  // Rechercher avec filtres
  const results = await curationSystem.searchContent(
    'content-curation-knowledge',
    'intelligence artificielle',
    {
      category: 'technology',
      quality: 'high',
      tags: ['generative']
    }
  );

  console.log('Résultats filtrés:', results.length);

  // Générer un résumé
  const summary = await curationSystem.generateContentSummary(
    'content-curation-knowledge',
    'IA générative',
    { includeStats: true, maxArticles: 5 }
  );

  console.log('Résumé:', summary.summary);
  console.log('Stats:', summary.stats);

  // Analytics
  const analytics = await curationSystem.getContentAnalytics('content-curation-knowledge');
  console.log('Analytics:', analytics);
}
