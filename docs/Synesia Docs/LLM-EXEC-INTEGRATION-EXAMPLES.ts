/**
 * Exemples d'intégration de l'API LLM Exec Synesia
 * Collection d'exemples pratiques pour différents cas d'usage
 */

interface SynesiaConfig {
  baseUrl: string;
  apiKey: string;
  projectId?: string;
}

interface LLMConfig {
  temperature?: number;
  max_completion_tokens?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
}

interface ToolDefinition {
  type: 'callable' | 'knowledge' | 'mcp' | 'openapi' | 'custom';
  [key: string]: any;
}

/**
 * Client de base pour l'API Synesia
 */
class SynesiaClient {
  constructor(private config: SynesiaConfig) {}

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      ...(this.config.projectId && { 'x-project-id': this.config.projectId })
    };
  }

  async chat(
    model: string,
    messages: any[],
    tools: ToolDefinition[] = [],
    llmConfig: LLMConfig = {},
    stream = false
  ) {
    const endpoint = stream ? '/v1/llm-exec/round/stream' : '/v1/llm-exec/round';

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model,
        messages,
        tools,
        llmConfig: {
          temperature: 0.7,
          max_completion_tokens: 1000,
          ...llmConfig
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Synesia API error: ${error.message}`);
    }

    return stream ? this.handleStream(response) : response.json();
  }

  private async *handleStream(response: Response) {
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
          yield data;
        } catch (e) {
          // Ignore invalid JSON
        }
      }
    }
  }
}

/**
 * Exemple 1: Agent simple avec recherche documentaire
 */
export async function exampleBasicKnowledgeSearch() {
  const client = new SynesiaClient({
    baseUrl: 'https://origins-server.up.railway.app',
    apiKey: process.env.SYNESIA_API_KEY!
  });

  const response = await client.chat(
    'gpt-4o-mini',
    [
      {
        role: 'user',
        content: 'Comment créer un agent dans Synesia ?'
      }
    ],
    [
      {
        type: 'knowledge',
        knowledge_id: 'docs-knowledge-uuid',
        name: 'search_docs',
        description: 'Recherche dans la documentation Synesia',
        allowed_actions: ['search']
      }
    ],
    {
      temperature: 0.3,
      max_completion_tokens: 500
    }
  );

  console.log('Réponse:', response.message.content);
  console.log('Usage:', response.usage);

  return response;
}

/**
 * Exemple 2: Agent avec API GitHub intégrée
 */
export async function exampleGitHubIntegration() {
  const client = new SynesiaClient({
    baseUrl: 'https://origins-server.up.railway.app',
    apiKey: process.env.SYNESIA_API_KEY!
  });

  const githubTool: ToolDefinition = {
    type: 'openapi',
    schema: {
      openapi: '3.0.0',
      info: { title: 'GitHub API', version: '2022-11-28' },
      servers: [{ url: 'https://api.github.com' }],
      paths: {
        '/repos/{owner}/{repo}/issues': {
          get: {
            operationId: 'listIssues',
            summary: 'List repository issues',
            parameters: [
              { name: 'owner', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'repo', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'state', in: 'query', schema: { type: 'string', enum: ['open', 'closed', 'all'] } }
            ]
          }
        }
      }
    },
    base_url: 'https://api.github.com',
    description: 'GitHub Issues API',
    allowed_operations: ['listIssues'],
    security: [
      {
        type: 'http',
        scheme: 'bearer',
        value: process.env.GITHUB_TOKEN!
      }
    ]
  };

  const response = await client.chat(
    'claude-3-haiku',
    [
      {
        role: 'user',
        content: 'Montre-moi les issues ouvertes dans le repo synesia-ai/synesia'
      }
    ],
    [githubTool],
    { temperature: 0.2 }
  );

  return response;
}

/**
 * Exemple 3: Agent multi-outils avec streaming
 */
export async function exampleMultiToolStreaming() {
  const client = new SynesiaClient({
    baseUrl: 'https://origins-server.up.railway.app',
    apiKey: process.env.SYNESIA_API_KEY!
  });

  const tools: ToolDefinition[] = [
    {
      type: 'websearch'
    },
    {
      type: 'code_interpreter'
    },
    {
      type: 'knowledge',
      knowledge_id: 'company-data-uuid',
      name: 'search_company_data',
      description: 'Recherche dans les données entreprise',
      allowed_actions: ['search']
    }
  ];

  const stream = await client.chat(
    'gpt-4o-mini',
    [
      {
        role: 'user',
        content: 'Analyse les tendances marché de notre secteur et génère un rapport avec graphiques'
      }
    ],
    tools,
    {
      temperature: 0.5,
      max_completion_tokens: 2000
    },
    true // streaming activé
  );

  for await (const event of stream) {
    switch (event.type) {
      case 'chunk':
        process.stdout.write(event.content);
        break;
      case 'tool_call':
        console.log(`\\n🔧 Exécution outil: ${event.tool_name}`);
        break;
      case 'tool_result':
        console.log(`✅ Résultat outil: ${event.tool_name}`);
        break;
      case 'end':
        console.log('\\n\\n📊 Usage final:', event.usage);
        break;
    }
  }
}

/**
 * Exemple 4: Intégration MCP personnalisée
 */
export async function exampleMCPServerIntegration() {
  const client = new SynesiaClient({
    baseUrl: 'https://origins-server.up.railway.app',
    apiKey: process.env.SYNESIA_API_KEY!
  });

  const mcpTool: ToolDefinition = {
    type: 'mcp',
    server_label: 'custom-data-analyzer',
    server_url: 'https://mcp.scrivia.com/data-analyzer',
    allowed_tools: ['analyze_dataset', 'generate_report', 'export_csv'],
    require_approval: 'auto',
    headers: {
      'Authorization': `Bearer ${process.env.SCRIVIA_MCP_TOKEN}`,
      'X-Project-ID': 'scrivia-project-123'
    }
  };

  const response = await client.chat(
    'groq-llama-3-70b',
    [
      {
        role: 'user',
        content: 'Analyse ce dataset et génère un rapport PDF'
      }
    ],
    [mcpTool],
    { temperature: 0.3 }
  );

  return response;
}

/**
 * Exemple 5: Agent avec outils groupés (Kit)
 */
export async function exampleToolKit() {
  const client = new SynesiaClient({
    baseUrl: 'https://origins-server.up.railway.app',
    apiKey: process.env.SYNESIA_API_KEY!
  });

  const devKit: ToolDefinition = {
    type: 'kit',
    name: 'development_tools',
    description: 'Suite d\'outils pour le développement',
    tools: [
      {
        type: 'mcp',
        server_label: 'vscode',
        server_url: 'https://mcp-vscode.scrivia.com',
        allowed_tools: ['run_tests', 'lint_code', 'format_files']
      },
      {
        type: 'openapi',
        schema: {
          // Schéma GitHub complet
          openapi: '3.0.0',
          paths: {
            '/repos/{owner}/{repo}/pulls': {
              post: {
                operationId: 'createPullRequest',
                summary: 'Create a pull request'
              }
            }
          }
        },
        base_url: 'https://api.github.com',
        description: 'GitHub PR Management',
        allowed_operations: ['createPullRequest']
      }
    ]
  };

  const response = await client.chat(
    'gpt-4o-mini',
    [
      {
        role: 'user',
        content: 'Crée une PR pour mes changements et lance les tests'
      }
    ],
    [devKit],
    { temperature: 0.2 }
  );

  return response;
}

/**
 * Exemple 6: Gestion d'erreurs robuste
 */
export async function exampleErrorHandling() {
  const client = new SynesiaClient({
    baseUrl: 'https://origins-server.up.railway.app',
    apiKey: process.env.SYNESIA_API_KEY!
  });

  try {
    const response = await client.chat(
      'invalid-model',
      [{ role: 'user', content: 'Hello' }]
    );
  } catch (error) {
    if (error.message.includes('model not found')) {
      console.log('Modèle non trouvé, utilisation du modèle par défaut');
      // Retry avec un modèle valide
      return await client.chat(
        'gpt-4o-mini',
        [{ role: 'user', content: 'Hello' }]
      );
    }

    if (error.message.includes('rate limit')) {
      console.log('Rate limit atteint, attente...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      // Retry
      return await client.chat(
        'gpt-4o-mini',
        [{ role: 'user', content: 'Hello' }]
      );
    }

    throw error;
  }
}

/**
 * Exemple 7: Intégration dans une application Scrivia
 */
export class ScriviaSynesiaProvider {
  private client: SynesiaClient;

  constructor(apiKey: string) {
    this.client = new SynesiaClient({
      baseUrl: 'https://origins-server.up.railway.app',
      apiKey
    });
  }

  async sendMessage(
    message: string,
    conversationHistory: any[] = [],
    tools: any[] = []
  ) {
    // Convertir les outils Scrivia vers le format Synesia
    const synesiaTools = this.convertScriviaTools(tools);

    const messages = [
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    const response = await this.client.chat(
      'gpt-4o-mini',
      messages,
      synesiaTools,
      { temperature: 0.7 }
    );

    return {
      content: response.message.content,
      usage: response.usage,
      toolCalls: response.message.tool_calls || []
    };
  }

  private convertScriviaTools(scriviaTools: any[]): ToolDefinition[] {
    return scriviaTools.map(tool => {
      switch (tool.type) {
        case 'api':
          return {
            type: 'openapi',
            schema: tool.openapiSchema,
            base_url: tool.baseUrl,
            description: tool.name,
            allowed_operations: tool.allowedOperations,
            security: tool.auth ? [{
              type: 'http',
              scheme: 'bearer',
              value: tool.auth.token
            }] : undefined
          };

        case 'mcp':
          return {
            type: 'mcp',
            server_label: tool.name,
            server_url: tool.endpoint,
            allowed_tools: tool.allowedTools,
            headers: tool.headers
          };

        case 'knowledge':
          return {
            type: 'knowledge',
            knowledge_id: tool.datasetId,
            name: `search_${tool.name}`,
            description: tool.description,
            allowed_actions: ['search']
          };

        default:
          return tool;
      }
    });
  }

  async *streamMessage(
    message: string,
    conversationHistory: any[] = [],
    tools: any[] = []
  ) {
    const synesiaTools = this.convertScriviaTools(tools);
    const messages = [
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    const stream = await this.client.chat(
      'gpt-4o-mini',
      messages,
      synesiaTools,
      { temperature: 0.7 },
      true
    );

    for await (const event of stream) {
      yield this.convertSynesiaEvent(event);
    }
  }

  private convertSynesiaEvent(event: any) {
    switch (event.type) {
      case 'chunk':
        return { type: 'content', content: event.content };
      case 'tool_call':
        return { type: 'tool_start', tool: event.tool_name, args: event.args };
      case 'tool_result':
        return { type: 'tool_result', tool: event.tool_name, result: event.result };
      case 'end':
        return { type: 'done', usage: event.usage };
      default:
        return event;
    }
  }
}

// Utilisation dans Scrivia
export async function integrateWithScrivia() {
  const provider = new ScriviaSynesiaProvider(process.env.SYNESIA_API_KEY!);

  // Exemple d'utilisation
  const response = await provider.sendMessage(
    'Analyse cette API et crée un client',
    [],
    [
      {
        type: 'api',
        name: 'Stripe API',
        openapiSchema: stripeSchema,
        baseUrl: 'https://api.stripe.com',
        allowedOperations: ['listCustomers', 'createPayment'],
        auth: { token: process.env.STRIPE_SECRET_KEY }
      }
    ]
  );

  return response;
}

/**
 * Types TypeScript pour une intégration type-safe
 */
export interface SynesiaMessage {
  role: 'user' | 'assistant' | 'system' | 'tool_request' | 'tool_response';
  content: string;
  name?: string;
  reasoning?: string;
  tool_calls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, any>;
  }>;
}

export interface SynesiaToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface SynesiaResponse {
  message: SynesiaMessage;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason: string;
}

export interface SynesiaStreamEvent {
  type: 'start' | 'chunk' | 'tool_call' | 'tool_result' | 'end' | 'error';
  content?: string;
  tool_name?: string;
  args?: Record<string, any>;
  result?: any;
  usage?: SynesiaResponse['usage'];
  error?: {
    message: string;
    code?: string;
  };
}
